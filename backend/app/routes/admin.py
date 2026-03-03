import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.jwt import get_current_user
from app.db.deps import get_db
from app.models.admin_invite import AdminInvite
from app.models.user import User

INVITE_EXPIRE_HOURS = 24

router = APIRouter(prefix="/admin", tags=["admin"])


class InviteResponse(BaseModel):
    invite_code: str
    expires_at: str


def _hash_code(code: str) -> str:
    """SHA-256 hex digest of the plaintext invite code."""
    return hashlib.sha256(code.encode()).hexdigest()


@router.post("/invites", response_model=InviteResponse)
def create_invite(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a one-time invite code for admin activation (super_admin only)."""
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Only super_admin can create invites")

    code = secrets.token_urlsafe(12)[:12]  # 12-char URL-safe random string
    code_hash = _hash_code(code)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=INVITE_EXPIRE_HOURS)

    invite = AdminInvite(
        code_hash=code_hash,
        expires_at=expires_at,
        created_by=current_user.id,
    )
    db.add(invite)
    db.commit()

    return InviteResponse(invite_code=code, expires_at=expires_at.isoformat())
