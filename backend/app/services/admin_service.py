"""Admin service – business logic for invite management."""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.jwt import create_activation_token
from app.models.admin_invite import AdminInvite
from app.models.user import User
from app.repositories import admin_invite_repository, user_repository
from app.services.email_delivery import EmailDeliveryError
from app.services.invite_delivery import send_invite

INVITE_EXPIRE_HOURS = 24


def _hash_code(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()


def require_super_admin(user: User) -> None:
    if user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Forbidden: Requires super_admin privileges.")


def list_invites(db: Session) -> list[AdminInvite]:
    return admin_invite_repository.list_all_invites(db)


def create_invite(
    *,
    recipient_identifier: str,
    current_user: User,
    db: Session,
) -> dict:
    """Create and send a new admin invite. Returns structured response dict."""
    existing_user = user_repository.get_user_by_email(db, recipient_identifier)
    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="An active user account with this email already exists.",
        )

    now = datetime.now(timezone.utc)
    existing_invite = admin_invite_repository.get_active_invite_for_recipient(
        db, recipient_identifier, now
    )
    if existing_invite:
        raise HTTPException(
            status_code=409,
            detail="A valid, unexpired invitation already exists for this email. Revoke the previous one before issuing a new one.",
        )

    code = secrets.token_urlsafe(16)[:16]
    code_hash = _hash_code(code)
    expires_at = now + timedelta(hours=INVITE_EXPIRE_HOURS)

    new_invite = admin_invite_repository.create_invite(
        db,
        code_hash=code_hash,
        recipient_identifier=recipient_identifier,
        expires_at=expires_at,
        created_by=current_user.id,
    )

    activation_token = create_activation_token(new_invite.id, expires_at)
    activation_url = f"{settings.ADMIN_FRONTEND_URL}/activate-admin?token={activation_token}"

    try:
        send_invite(recipient_identifier, activation_url)
        new_invite.status = "SENT"
        db.commit()
        message = f"An invitation has been successfully sent to {recipient_identifier}."
    except EmailDeliveryError:
        message = (
            f"Invitation for {recipient_identifier} was created, but email delivery failed. "
            "The invite code must be sent manually."
        )

    response = {
        "status": "success",
        "message": message,
        "invite": {
            "id": new_invite.id,
            "recipient_identifier": new_invite.recipient_identifier,
            "status": new_invite.status,
            "expires_at": new_invite.expires_at,
        },
        "activation_details": None,
    }

    if settings.ENVIRONMENT != "production":
        response["activation_details"] = {
            "invite_code": code,
            "activation_url": activation_url,
        }

    return response


def revoke_invite(
    *,
    invite_id: int,
    reason: str,
    current_user: User,
    db: Session,
) -> dict:
    invite = admin_invite_repository.get_invite_by_id(db, invite_id)
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
    invite.revoked_reason = reason
    db.commit()
    db.refresh(invite)

    return {
        "message": f"Invitation for {invite.recipient_identifier} has been revoked.",
        "invite": invite,
    }


def delete_invite(*, invite_id: int, db: Session) -> dict:
    invite = admin_invite_repository.get_invite_by_id(db, invite_id)
    if not invite:
        raise HTTPException(status_code=404, detail="Invitation record not found.")

    if invite.status not in ("EXPIRED", "REVOKED", "USED"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot remove ledger record with status '{invite.status}'. Only expired, revoked, or used records can be removed.",
        )

    admin_invite_repository.delete_invite(db, invite)
    return {"message": "Ledger record permanently removed.", "id": invite_id}
