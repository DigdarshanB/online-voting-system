import logging
from datetime import datetime, timezone
from pathlib import Path

import pyotp
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.core.jwt import get_current_user
from app.models.user import User
from app.utils.rate_limit import check_named_rate_limit
from app.services.auth_audit import audit_auth_event

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/verification", tags=["verification"])

_TOTP_ALLOWED_ROLES = ("voter", "admin", "super_admin")

_UPLOAD_BASE_CITIZENSHIP = Path(__file__).resolve().parents[2] / "uploads" / "citizenship"
_UPLOAD_BASE_FACES = Path(__file__).resolve().parents[2] / "uploads" / "faces"
_MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
_ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png"}
_EXT_MAP = {"image/jpeg": "jpg", "image/png": "png"}

# Minimum size for a valid image (a real face photo will be >1 KB)
_MIN_IMAGE_SIZE = 1000


def _detect_image_type(data: bytes) -> str | None:
    """Detect actual image type from file magic bytes.

    Returns 'image/jpeg' or 'image/png' if recognized, else None.
    This is more reliable than trusting the Content-Type header,
    especially for browser camera captures which may send
    'application/octet-stream' or an incorrect MIME type.
    """
    if len(data) < 8:
        return None
    # JPEG: starts with FF D8 FF
    if data[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    # PNG: starts with 89 50 4E 47 0D 0A 1A 0A
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    return None


def _require_authenticated(user: User) -> User:
    """Allow any recognized role to access TOTP endpoints."""
    if user.role not in _TOTP_ALLOWED_ROLES:
        raise HTTPException(status_code=403, detail="Access denied")
    return user


# ── DTOs ────────────────────────────────────────────────────────

class TOTPVerifyRequest(BaseModel):
    code: str


# ── POST /verification/totp/setup ──────────────────────────────

@router.post("/totp/setup")
def totp_setup(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_authenticated(current_user)

    if current_user.totp_enabled_at is not None:
        raise HTTPException(status_code=400, detail="TOTP is already enabled")

    secret = pyotp.random_base32()
    current_user.totp_secret = secret
    db.commit()

    totp = pyotp.TOTP(secret)
    label = f"{current_user.role}:{current_user.citizenship_no_normalized or current_user.id}"
    uri = totp.provisioning_uri(
        name=label,
        issuer_name="OnlineVotingSystem",
    )
    return {"otpauth_uri": uri}


# ── POST /verification/totp/verify ─────────────────────────────

@router.post("/totp/verify")
def totp_verify(
    payload: TOTPVerifyRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_authenticated(current_user)
    client_ip = request.client.host if request.client else "unknown"
    check_named_rate_limit("totp_verify_user", f"totp_verify:user:{current_user.id}")
    check_named_rate_limit("totp_verify_ip", f"totp_verify:ip:{client_ip}")

    # Voters can verify TOTP in PENDING_DOCUMENT or ACTIVE state;
    # admins may be PENDING_MFA or ACTIVE.
    if current_user.role == "voter":
        allowed_statuses = ("PENDING_DOCUMENT", "ACTIVE")
    else:
        allowed_statuses = ("PENDING_MFA", "ACTIVE")
    if current_user.status not in allowed_statuses:
        raise HTTPException(
            status_code=403,
            detail="Account is not in a state that allows TOTP verification",
        )

    if not current_user.totp_secret:
        raise HTTPException(status_code=400, detail="TOTP setup not started")

    totp = pyotp.TOTP(current_user.totp_secret)
    if not totp.verify(payload.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid TOTP code")

    was_enrolled = current_user.totp_enabled_at is not None
    current_user.totp_enabled_at = datetime.now(timezone.utc)

    # Admin-only: transition PENDING_MFA → PENDING_APPROVAL.
    if current_user.role != "voter" and current_user.status == "PENDING_MFA":
        current_user.status = "PENDING_APPROVAL"

    db.commit()
    audit_auth_event(
        action="TOTP_ENROLLED" if not was_enrolled else "TOTP_VERIFIED",
        actor_user_id=current_user.id,
        target_user_id=current_user.id,
        request=request,
        metadata={"role": current_user.role, "status": current_user.status},
    )
    return {"detail": "TOTP verified successfully", "success": True}


# ── POST /verification/citizenship/upload ───────────────────────

@router.post("/citizenship/upload")
async def citizenship_upload(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Only voters may upload citizenship documents.
    if current_user.role != "voter":
        raise HTTPException(status_code=403, detail="Only voters can upload citizenship documents")

    # Validate content type.
    if file.content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG and PNG images are accepted")

    # Read file data and enforce size limit.
    data = await file.read()
    if len(data) > _MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 5 MB size limit")

    ext = _EXT_MAP[file.content_type]
    user_dir = _UPLOAD_BASE_CITIZENSHIP / str(current_user.id)
    user_dir.mkdir(parents=True, exist_ok=True)

    dest = user_dir / f"citizenship.{ext}"
    dest.write_bytes(data)

    relative_path = f"uploads/citizenship/{current_user.id}/citizenship.{ext}"
    now = datetime.now(timezone.utc)

    current_user.citizenship_image_path = relative_path
    current_user.document_uploaded_at = now

    # Transition voter to face verification step (not directly to review).
    if current_user.status in ("PENDING_DOCUMENT", "REJECTED"):
        current_user.status = "PENDING_FACE"

    db.commit()

    return {
        "success": True,
        "path": relative_path,
        "uploaded_at": now.isoformat(),
        "next_step": "face_verification",
    }


# ── POST /verification/face/upload ────────────────────────────

@router.post("/face/upload")
async def face_upload(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Only voters may upload face photos.
    if current_user.role != "voter":
        raise HTTPException(status_code=403, detail="Only voters can upload face photos")

    # Citizenship document must be uploaded first.
    if not current_user.citizenship_image_path:
        raise HTTPException(status_code=400, detail="Citizenship document must be uploaded before face verification")

    # Read file data first so we can inspect actual content.
    data = await file.read()

    logger.info(
        "[face_upload] user=%s header_content_type=%s filename=%s size=%d",
        current_user.id, file.content_type, file.filename, len(data),
    )

    if len(data) > _MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 5 MB size limit")

    if len(data) < _MIN_IMAGE_SIZE:
        logger.warning("[face_upload] user=%s image too small (%d bytes)", current_user.id, len(data))
        raise HTTPException(
            status_code=400,
            detail="Image is too small or empty. Please capture a clear face photo.",
        )

    # Detect actual image type from magic bytes — this is the authoritative check.
    # Browser camera captures may send content_type as 'application/octet-stream'
    # or other unexpected values, so we do not rely on the header alone.
    detected_type = _detect_image_type(data)
    if detected_type is None:
        logger.warning(
            "[face_upload] user=%s unrecognized image format (header said %s)",
            current_user.id, file.content_type,
        )
        raise HTTPException(
            status_code=400,
            detail="Invalid image. Only JPEG and PNG images are accepted. Please retake your photo.",
        )

    logger.info("[face_upload] user=%s detected_type=%s", current_user.id, detected_type)

    ext = _EXT_MAP[detected_type]
    user_dir = _UPLOAD_BASE_FACES / str(current_user.id)
    user_dir.mkdir(parents=True, exist_ok=True)

    # Remove any previous face image in the directory.
    for old_file in user_dir.iterdir():
        if old_file.is_file() and old_file.stem == "face":
            old_file.unlink()

    dest = user_dir / f"face.{ext}"
    dest.write_bytes(data)

    relative_path = f"uploads/faces/{current_user.id}/face.{ext}"
    now = datetime.now(timezone.utc)

    current_user.face_image_path = relative_path
    current_user.face_uploaded_at = now

    # Move to pending review after face upload.
    if current_user.status in ("PENDING_FACE",):
        current_user.status = "PENDING_REVIEW"

    db.commit()

    logger.info("[face_upload] user=%s upload OK path=%s", current_user.id, relative_path)

    return {
        "success": True,
        "path": relative_path,
        "uploaded_at": now.isoformat(),
    }
