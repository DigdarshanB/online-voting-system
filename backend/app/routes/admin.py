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
from app.services.admin_service import (
    require_super_admin,
    list_invites as svc_list_invites,
    create_invite as svc_create_invite,
    revoke_invite as svc_revoke_invite,
    delete_invite as svc_delete_invite,
)
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
    require_super_admin(user)


# ── Endpoints ───────────────────────────────────────────────────


@router.get("/invites", response_model=List[InvitationLedgerItem])
def list_invites(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_super_admin(current_user)
    return svc_list_invites(db)


@router.post("/invites", response_model=CreateInviteResponse, status_code=201)
def create_invite(
    payload: CreateInviteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_super_admin(current_user)
    check_rate_limit(f"invite_create:{current_user.id}", limit=30, window_seconds=3600)
    return svc_create_invite(
        recipient_identifier=payload.recipient_identifier,
        current_user=current_user,
        db=db,
    )


@router.post("/invites/{invite_id}/revoke", response_model=RevokeInviteResponse)
def revoke_invite(
    invite_id: int,
    payload: RevokeInviteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_super_admin(current_user)
    result = svc_revoke_invite(
        invite_id=invite_id,
        reason=payload.reason,
        current_user=current_user,
        db=db,
    )
    return RevokeInviteResponse(
        message=result["message"],
        invite=InvitationLedgerItem.from_orm(result["invite"]),
    )


@router.delete("/invites/{invite_id}", response_model=DeleteInviteResponse)
def delete_invite(
    invite_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_super_admin(current_user)
    return svc_delete_invite(invite_id=invite_id, db=db)

