from datetime import datetime, timezone

import pyotp
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.core.jwt import get_current_user
from app.models.user import User

router = APIRouter(prefix="/verification", tags=["verification"])

ALLOWED_ROLES = ("admin", "super_admin")


def _require_admin(user: User) -> User:
    if user.role not in ALLOWED_ROLES:
        raise HTTPException(status_code=403, detail="Admin access required")
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
    _require_admin(current_user)

    if current_user.totp_enabled_at is not None:
        raise HTTPException(status_code=400, detail="TOTP is already enabled")

    secret = pyotp.random_base32()
    current_user.totp_secret = secret
    db.commit()

    totp = pyotp.TOTP(secret)
    uri = totp.provisioning_uri(
        name=current_user.citizenship_no_normalized or str(current_user.id),
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
    _require_admin(current_user)

    if not current_user.totp_secret:
        raise HTTPException(status_code=400, detail="TOTP setup not started")

    totp = pyotp.TOTP(current_user.totp_secret)
    if not totp.verify(payload.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid TOTP code")

    current_user.totp_enabled_at = datetime.now(timezone.utc)
    db.commit()
    return {"success": True}
