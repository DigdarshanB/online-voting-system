"""Pending voter registration lifecycle.

Covers submission, TOTP setup/verify, and document/face uploads.
Admin approval and conversion into a real user row are handled in
verification_service.py.
"""

import logging
from datetime import datetime, timezone
from pathlib import Path

import pyotp
from fastapi import HTTPException, Request
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.repositories import pending_registration_repository, user_repository
from app.utils.citizenship import normalize_citizenship_number

logger = logging.getLogger(__name__)

_UPLOAD_BASE_CITIZENSHIP = Path(__file__).resolve().parents[2] / "uploads" / "pending_citizenship"
_UPLOAD_BASE_FACES = Path(__file__).resolve().parents[2] / "uploads" / "pending_faces"
_MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
_ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png"}
_EXT_MAP = {"image/jpeg": "jpg", "image/png": "png"}
_MIN_IMAGE_SIZE = 1000

PASSWORD_POLICY_DETAIL = (
    "Password must be 8-128 characters and include at least one uppercase letter, "
    "one lowercase letter, and one number."
)
_PASSWORD_UPPER_RE = __import__("re").compile(r"[A-Z]")
_PASSWORD_LOWER_RE = __import__("re").compile(r"[a-z]")
_PASSWORD_DIGIT_RE = __import__("re").compile(r"\d")


def _detect_image_type(data: bytes) -> str | None:
    if len(data) < 8:
        return None
    if data[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    return None


def _validate_password(password: str) -> None:
    if not (8 <= len(password) <= 128):
        raise HTTPException(status_code=400, detail=PASSWORD_POLICY_DETAIL)
    if not _PASSWORD_UPPER_RE.search(password):
        raise HTTPException(status_code=400, detail=PASSWORD_POLICY_DETAIL)
    if not _PASSWORD_LOWER_RE.search(password):
        raise HTTPException(status_code=400, detail=PASSWORD_POLICY_DETAIL)
    if not _PASSWORD_DIGIT_RE.search(password):
        raise HTTPException(status_code=400, detail=PASSWORD_POLICY_DETAIL)


# ── Submit new registration ─────────────────────────────────────

def submit_registration(
    *,
    email: str,
    full_name: str,
    phone_number: str,
    citizenship_number: str,
    password: str,
    request: Request,
    db: Session,
) -> dict:
    """Create a pending voter registration.

    Does NOT create a users row. The first step is TOTP authenticator setup.
    """
    normalized = normalize_citizenship_number(citizenship_number)
    _validate_password(password)

    # ── Duplicate checks: both real users AND active pending registrations ─
    if user_repository.get_user_by_citizenship_normalized(db, normalized):
        raise HTTPException(status_code=400, detail="Citizenship number already registered")
    if user_repository.get_user_by_email(db, email):
        raise HTTPException(status_code=400, detail="Email already registered")
    if pending_registration_repository.get_by_citizenship_normalized(db, normalized):
        raise HTTPException(
            status_code=400,
            detail="A registration with this citizenship number is already in progress",
        )
    if pending_registration_repository.get_by_email(db, email):
        raise HTTPException(
            status_code=400,
            detail="A registration with this email is already in progress",
        )

    # ── Persist pending registration ────────────────────────────
    reg = pending_registration_repository.create(
        db,
        full_name=full_name,
        email=email,
        phone_number=phone_number,
        citizenship_no_raw=citizenship_number,
        citizenship_no_normalized=normalized,
        hashed_password=hash_password(password),
        status="PENDING_TOTP",
    )
    db.commit()

    return {
        "registration_id": reg.id,
        "status": reg.status,
        "email": reg.email,
        "message": "Registration submitted. Please set up your authenticator app to continue.",
    }


# ── TOTP authenticator setup ───────────────────────────────────

def totp_setup_registration(*, registration_id: int, db: Session) -> dict:
    """Generate a TOTP secret for a pending registration and return the QR URI."""
    reg = pending_registration_repository.get_by_id(db, registration_id)
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    if reg.status != "PENDING_TOTP":
        raise HTTPException(status_code=400, detail="Authenticator setup not expected in this state")

    # Generate or re-use existing secret (allows rescanning)
    if not reg.totp_secret:
        reg.totp_secret = pyotp.random_base32()
        db.commit()

    totp = pyotp.TOTP(reg.totp_secret)
    label = f"voter:{reg.citizenship_no_normalized}"
    uri = totp.provisioning_uri(name=label, issuer_name="OnlineVotingSystem")

    return {
        "otpauth_uri": uri,
        "registration_id": reg.id,
    }


# ── TOTP authenticator verify ──────────────────────────────────

def totp_verify_registration(*, registration_id: int, code: str, db: Session) -> dict:
    """Verify a 6-digit TOTP code for a pending registration.

    On success, transitions PENDING_TOTP → PENDING_DOCUMENT.
    """
    reg = pending_registration_repository.get_by_id(db, registration_id)
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    if reg.status != "PENDING_TOTP":
        raise HTTPException(status_code=400, detail="TOTP verification not expected in this state")
    if not reg.totp_secret:
        raise HTTPException(status_code=400, detail="TOTP setup not started — please generate your QR code first")

    totp = pyotp.TOTP(reg.totp_secret)
    if not totp.verify(code, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid code. Please check your authenticator app and try again.")

    reg.status = "PENDING_DOCUMENT"
    db.commit()

    return {
        "registration_id": reg.id,
        "status": reg.status,
        "message": "Authenticator verified! Please continue with document upload.",
    }


# ── Registration status check ───────────────────────────────────

def get_registration_status(*, registration_id: int, db: Session) -> dict:
    reg = pending_registration_repository.get_by_id(db, registration_id)
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    return {
        "registration_id": reg.id,
        "email": reg.email,
        "status": reg.status,
        "totp_verified": reg.status != "PENDING_TOTP",
        "document_uploaded": reg.document_uploaded_at is not None,
        "face_uploaded": reg.face_uploaded_at is not None,
    }


# ── Document upload for pending registration ────────────────────

async def upload_document(
    *, registration_id: int, file_data: bytes, content_type: str, db: Session,
) -> dict:
    reg = pending_registration_repository.get_by_id(db, registration_id)
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    if reg.status not in ("PENDING_DOCUMENT", "REJECTED"):
        raise HTTPException(
            status_code=400,
            detail=f"Document upload not expected in status '{reg.status}'",
        )

    if content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG and PNG images are accepted")
    if len(file_data) > _MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 5 MB size limit")

    ext = _EXT_MAP[content_type]
    reg_dir = _UPLOAD_BASE_CITIZENSHIP / str(reg.id)
    reg_dir.mkdir(parents=True, exist_ok=True)
    dest = reg_dir / f"citizenship.{ext}"
    dest.write_bytes(file_data)

    relative_path = f"uploads/pending_citizenship/{reg.id}/citizenship.{ext}"
    now = datetime.now(timezone.utc)

    reg.citizenship_image_path = relative_path
    reg.document_uploaded_at = now
    if reg.status in ("PENDING_DOCUMENT", "REJECTED"):
        reg.status = "PENDING_FACE"
    db.commit()

    return {
        "success": True,
        "registration_id": reg.id,
        "status": reg.status,
        "next_step": "face_verification",
    }


# ── Face upload for pending registration ────────────────────────

async def upload_face(
    *, registration_id: int, file_data: bytes, content_type: str, db: Session,
) -> dict:
    reg = pending_registration_repository.get_by_id(db, registration_id)
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    if reg.status != "PENDING_FACE":
        raise HTTPException(
            status_code=400,
            detail=f"Face upload not expected in status '{reg.status}'",
        )
    if not reg.citizenship_image_path:
        raise HTTPException(
            status_code=400,
            detail="Citizenship document must be uploaded before face verification",
        )

    if len(file_data) > _MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 5 MB size limit")
    if len(file_data) < _MIN_IMAGE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="Image is too small or empty. Please capture a clear face photo.",
        )

    detected_type = _detect_image_type(file_data)
    if detected_type is None:
        raise HTTPException(
            status_code=400,
            detail="Invalid image. Only JPEG and PNG images are accepted.",
        )

    ext = _EXT_MAP[detected_type]
    reg_dir = _UPLOAD_BASE_FACES / str(reg.id)
    reg_dir.mkdir(parents=True, exist_ok=True)

    for old_file in reg_dir.iterdir():
        if old_file.is_file() and old_file.stem == "face":
            old_file.unlink()

    dest = reg_dir / f"face.{ext}"
    dest.write_bytes(file_data)

    relative_path = f"uploads/pending_faces/{reg.id}/face.{ext}"
    now = datetime.now(timezone.utc)

    reg.face_image_path = relative_path
    reg.face_uploaded_at = now
    reg.status = "PENDING_REVIEW"
    db.commit()

    return {
        "success": True,
        "registration_id": reg.id,
        "status": reg.status,
    }
