from datetime import datetime, timezone
from pathlib import Path

import pyotp
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.core.jwt import get_current_user
from app.models.user import User
from app.utils.rate_limit import check_rate_limit

router = APIRouter(prefix="/verification", tags=["verification"])

_TOTP_ALLOWED_ROLES = ("voter", "admin", "super_admin")

_UPLOAD_BASE = Path(__file__).resolve().parents[2] / "uploads" / "citizenship"
_MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
_ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png"}
_EXT_MAP = {"image/jpeg": "jpg", "image/png": "png"}


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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_authenticated(current_user)
    check_rate_limit(f"totp_verify:{current_user.id}", limit=10, window_seconds=300)

    # Voters must be ACTIVE; admins may be PENDING_MFA or ACTIVE.
    allowed_statuses = ("ACTIVE",) if current_user.role == "voter" else ("PENDING_MFA", "ACTIVE")
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

    current_user.totp_enabled_at = datetime.now(timezone.utc)

    # Admin-only: transition PENDING_MFA → PENDING_APPROVAL.
    if current_user.role != "voter" and current_user.status == "PENDING_MFA":
        current_user.status = "PENDING_APPROVAL"

    db.commit()
    return {"success": True}


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
    user_dir = _UPLOAD_BASE / str(current_user.id)
    user_dir.mkdir(parents=True, exist_ok=True)

    dest = user_dir / f"citizenship.{ext}"
    dest.write_bytes(data)

    relative_path = f"uploads/citizenship/{current_user.id}/citizenship.{ext}"
    now = datetime.now(timezone.utc)

    current_user.citizenship_image_path = relative_path
    current_user.document_uploaded_at = now

    # Transition voter status so the document enters the admin review queue.
    if current_user.status in ("PENDING_DOCUMENT", "REJECTED"):
        current_user.status = "PENDING_REVIEW"

    db.commit()

    return {
        "success": True,
        "path": relative_path,
        "uploaded_at": now.isoformat(),
    }
