from datetime import datetime

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models.totp_recovery_request import TotpRecoveryRequest
from app.models.user import User


def invalidate_pending_requests(db: Session, user_id: int, now: datetime) -> None:
    """Expire all pending-code, unexpired recovery requests for a user."""
    db.execute(
        update(TotpRecoveryRequest)
        .where(
            TotpRecoveryRequest.user_id == user_id,
            TotpRecoveryRequest.status == "PENDING_CODE",
            TotpRecoveryRequest.used_at.is_(None),
            TotpRecoveryRequest.expires_at > now,
        )
        .values(status="EXPIRED", expires_at=now)
    )


def create_recovery_request(
    db: Session,
    *,
    user_id: int,
    email: str,
    role: str,
    code_hash: str,
    expires_at: datetime,
    requested_ip: str | None,
    requested_user_agent: str | None,
) -> TotpRecoveryRequest:
    row = TotpRecoveryRequest(
        user_id=user_id,
        email=email,
        role=role,
        code_hash=code_hash,
        expires_at=expires_at,
        requested_ip=requested_ip,
        requested_user_agent=requested_user_agent,
        status="PENDING_CODE",
    )
    db.add(row)
    return row


def get_pending_by_code_hash(
    db: Session, *, user_id: int, code_hash: str
) -> TotpRecoveryRequest | None:
    return db.execute(
        select(TotpRecoveryRequest)
        .where(
            TotpRecoveryRequest.user_id == user_id,
            TotpRecoveryRequest.code_hash == code_hash,
            TotpRecoveryRequest.status == "PENDING_CODE",
            TotpRecoveryRequest.used_at.is_(None),
        )
        .order_by(TotpRecoveryRequest.created_at.desc())
    ).scalar_one_or_none()


def get_request_by_id(db: Session, request_id: int) -> TotpRecoveryRequest | None:
    return db.execute(
        select(TotpRecoveryRequest).where(TotpRecoveryRequest.id == request_id)
    ).scalar_one_or_none()


def list_pending_admin_recoveries(db: Session) -> list:
    """List PENDING_APPROVAL recovery requests for admin-role users."""
    return db.query(
        TotpRecoveryRequest.id.label("request_id"),
        User.id.label("user_id"),
        User.full_name,
        User.email,
        TotpRecoveryRequest.status,
        TotpRecoveryRequest.created_at.label("requested_at"),
        TotpRecoveryRequest.requested_ip,
    ).join(User, TotpRecoveryRequest.user_id == User.id).filter(
        TotpRecoveryRequest.status == "PENDING_APPROVAL",
        User.role == "admin",
    ).order_by(TotpRecoveryRequest.created_at.asc()).all()
