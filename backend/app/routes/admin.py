import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.jwt import create_activation_token, get_current_user
from app.db.deps import get_db
from app.models.admin_invite import AdminInvite
from app.models.user import User
from app.services.invite_delivery import send_invite

INVITE_EXPIRE_HOURS = 24

router = APIRouter(prefix="/admin", tags=["admin"])


# ── Request / Response schemas ──────────────────────────────────


class CreateInviteRequest(BaseModel):
    recipient_identifier: str  # citizenship number or email of invitee


class InviteResponse(BaseModel):
    invite_code: str
    activation_token: str
    activation_url: str
    expires_at: str


class InviteListItem(BaseModel):
    id: int
    recipient_identifier: str
    status: str
    expires_at: str
    used_at: str | None
    revoked_at: str | None
    created_at: str


# ── Helpers ─────────────────────────────────────────────────────


def _hash_code(code: str) -> str:
    """SHA-256 hex digest of the plaintext invite code."""
    return hashlib.sha256(code.encode()).hexdigest()


def _require_super_admin(user: User) -> None:
    if user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Only super_admin can manage invites")


# ── Endpoints ───────────────────────────────────────────────────


@router.get("/invites", response_model=List[InviteListItem])
def list_invites(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all admin invites (super_admin only)."""
    _require_super_admin(current_user)

    invites = db.execute(
        select(AdminInvite).order_by(AdminInvite.created_at.desc())
    ).scalars().all()

    return [
        InviteListItem(
            id=inv.id,
            recipient_identifier=inv.recipient_identifier,
            status=inv.status,
            expires_at=inv.expires_at.isoformat() if inv.expires_at else "",
            used_at=inv.used_at.isoformat() if inv.used_at else None,
            revoked_at=inv.revoked_at.isoformat() if inv.revoked_at else None,
            created_at=inv.created_at.isoformat() if inv.created_at else "",
        )
        for inv in invites
    ]


@router.post("/invites", response_model=InviteResponse)
def create_invite(
    payload: CreateInviteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a one-time invite code for admin activation (super_admin only)."""
    _require_super_admin(current_user)

    code = secrets.token_urlsafe(12)[:12]  # 12-char URL-safe random string
    code_hash = _hash_code(code)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=INVITE_EXPIRE_HOURS)

    invite = AdminInvite(
        code_hash=code_hash,
        recipient_identifier=payload.recipient_identifier,
        status="ISSUED",
        expires_at=expires_at,
        created_by=current_user.id,
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)

    # Signed activation token — same expiry as the invite itself
    activation_token = create_activation_token(invite.id, expires_at)

    # Build activation URL — uses signed token (preferred over raw code)
    activation_url = (
        f"{settings.ADMIN_FRONTEND_URL}/?tab=activate&token={activation_token}"
    )

    # Notify recipient (stub: no email yet — super_admin copies the link)
    send_invite(payload.recipient_identifier, activation_url)

    return InviteResponse(
        invite_code=code,
        activation_token=activation_token,
        activation_url=activation_url,
        expires_at=expires_at.isoformat(),
    )


@router.post("/invites/{invite_id}/revoke")
def revoke_invite(
    invite_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Revoke an issued invite (super_admin only)."""
    _require_super_admin(current_user)

    invite = db.execute(
        select(AdminInvite).where(AdminInvite.id == invite_id)
    ).scalar_one_or_none()

    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")

    if invite.status != "ISSUED":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot revoke invite with status '{invite.status}'",
        )

    invite.status = "REVOKED"
    invite.revoked_at = datetime.now(timezone.utc)
    db.commit()

    return {"detail": "Invite revoked", "id": invite.id, "status": invite.status}


@router.delete("/invites/{invite_id}")
def delete_invite(
    invite_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Permanently delete an invite record (super_admin only)."""
    _require_super_admin(current_user)

    invite = db.execute(
        select(AdminInvite).where(AdminInvite.id == invite_id)
    ).scalar_one_or_none()

    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")

    db.delete(invite)
    db.commit()

    return {"success": True}
