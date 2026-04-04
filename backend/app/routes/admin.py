import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.jwt import create_activation_token, get_current_user
from app.db.deps import get_db
from app.models.admin_invite import AdminInvite
from app.models.user import User
from app.services.email_delivery import EmailDeliveryError
from app.services.invite_delivery import send_invite
from app.utils.rate_limit import check_rate_limit
from app.utils.email import normalize_email

INVITE_EXPIRE_HOURS = 24

router = APIRouter(prefix="/admin", tags=["admin"])


# ── Request / Response schemas ──────────────────────────────────


class CreateInviteRequest(BaseModel):
    recipient_identifier: str

    @field_validator("recipient_identifier")
    @classmethod
    def validate_recipient_identifier(cls, value: str) -> str:
        return normalize_email(value)


class RevokeInviteRequest(BaseModel):
    reason: str


class InviteDetails(BaseModel):
    id: int
    recipient_identifier: str
    status: str
    expires_at: datetime


class DevActivationDetails(BaseModel):
    """Activation details ONLY for dev/test environments."""
    invite_code: str
    activation_url: str


class CreateInviteResponse(BaseModel):
    status: str = "success"
    message: str
    invite: InviteDetails
    activation_details: DevActivationDetails | None = None


class InvitationLedgerItem(BaseModel):
    id: int
    recipient_identifier: str
    status: str
    created_at: datetime
    expires_at: datetime
    used_at: datetime | None = None
    revoked_at: datetime | None = None

    class Config:
        from_attributes = True


class RevokeInviteResponse(BaseModel):
    message: str
    invite: InvitationLedgerItem


class DeleteInviteResponse(BaseModel):
    message: str
    id: int


# ── Helpers ─────────────────────────────────────────────────────


def _hash_code(code: str) -> str:
    """SHA-256 hex digest of the plaintext invite code."""
    return hashlib.sha256(code.encode()).hexdigest()


def _require_super_admin(user: User) -> None:
    if user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Forbidden: Requires super_admin privileges.")


# ── Endpoints ───────────────────────────────────────────────────


@router.get("/invites", response_model=List[InvitationLedgerItem])
def list_invites(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all admin invites (super_admin only)."""
    _require_super_admin(current_user)

    invites = db.execute(
        select(AdminInvite).order_by(AdminInvite.created_at.desc())
    ).scalars().all()

    return invites


@router.post("/invites", response_model=CreateInviteResponse, status_code=201)
def create_invite(
    payload: CreateInviteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a one-time invite for admin activation (super_admin only)."""
    _require_super_admin(current_user)
    check_rate_limit(f"invite_create:{current_user.id}", limit=30, window_seconds=3600)

    # 1. Validate recipient doesn't already exist
    existing_user = db.execute(
        select(User).where(User.email == payload.recipient_identifier)
    ).scalar_one_or_none()
    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="An active user account with this email already exists.",
        )

    # 2. Validate no other active, unexpired invite exists
    now = datetime.now(timezone.utc)
    existing_invite = db.execute(
        select(AdminInvite)
        .where(
            AdminInvite.recipient_identifier == payload.recipient_identifier,
            AdminInvite.status.in_(["ISSUED", "SENT"]),
            AdminInvite.expires_at > now
        )
    ).scalar_one_or_none()
    if existing_invite:
        raise HTTPException(
            status_code=409,
            detail="A valid, unexpired invitation already exists for this email. Revoke the previous one before issuing a new one."
        )

    # 3. Create new invite
    code = secrets.token_urlsafe(16)[:16]
    code_hash = _hash_code(code)
    expires_at = now + timedelta(hours=INVITE_EXPIRE_HOURS)

    new_invite = AdminInvite(
        code_hash=code_hash,
        recipient_identifier=payload.recipient_identifier,
        status="ISSUED",
        expires_at=expires_at,
        created_by=current_user.id,
    )
    db.add(new_invite)
    db.commit()
    db.refresh(new_invite)

    # 4. Send email
    activation_token = create_activation_token(new_invite.id, expires_at)
    activation_url = f"{settings.ADMIN_FRONTEND_URL}/activate-admin?token={activation_token}"
    
    try:
        send_invite(payload.recipient_identifier, activation_url)
        new_invite.status = "SENT"
        db.commit()
        message = f"An invitation has been successfully sent to {payload.recipient_identifier}."
    except EmailDeliveryError:
        message = (
            f"Invitation for {payload.recipient_identifier} was created, but email delivery failed. "
            "The invite code must be sent manually."
        )

    # 5. Shape and return the response
    response = CreateInviteResponse(
        message=message,
        invite=InviteDetails(
            id=new_invite.id,
            recipient_identifier=new_invite.recipient_identifier,
            status=new_invite.status,
            expires_at=new_invite.expires_at,
        ),
    )

    if settings.ENVIRONMENT != "production":
        response.activation_details = DevActivationDetails(
            invite_code=code,
            activation_url=activation_url,
        )

    return response


@router.post("/invites/{invite_id}/revoke", response_model=RevokeInviteResponse)
def revoke_invite(
    invite_id: int,
    payload: RevokeInviteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Revoke an issued invite (super_admin only)."""
    _require_super_admin(current_user)

    invite = db.execute(
        select(AdminInvite).where(AdminInvite.id == invite_id)
    ).scalar_one_or_none()

    if not invite:
        raise HTTPException(status_code=404, detail="Invitation record not found.")

    if invite.status not in ("ISSUED", "SENT"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot revoke an invitation with status '{invite.status}'. Only 'ISSUED' or 'SENT' invites can be revoked.",
        )

    invite.status = "REVOKED"
    invite.revoked_at = datetime.now(timezone.utc)
    invite.revoked_by_user_id = current_user.id
    invite.revoked_reason = payload.reason
    db.commit()
    db.refresh(invite)

    return RevokeInviteResponse(
        message=f"Invitation for {invite.recipient_identifier} has been revoked.",
        invite=InvitationLedgerItem.from_orm(invite)
    )


@router.delete("/invites/{invite_id}", response_model=DeleteInviteResponse)
def delete_invite(
    invite_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Permanently delete an invite record from the ledger (super_admin only).
    This is a cleanup action for terminal-state invites.
    """
    _require_super_admin(current_user)

    invite = db.execute(
        select(AdminInvite).where(AdminInvite.id == invite_id)
    ).scalar_one_or_none()

    if not invite:
        raise HTTPException(status_code=404, detail="Invitation record not found.")

    if invite.status not in ("EXPIRED", "REVOKED", "USED"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot remove ledger record with status '{invite.status}'. Only expired, revoked, or used records can be removed."
        )

    db.delete(invite)
    db.commit()

    return DeleteInviteResponse(
        message="Ledger record permanently removed.",
        id=invite_id
    )

