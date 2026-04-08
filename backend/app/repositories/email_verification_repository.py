from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models.email_verification import EmailVerification


def invalidate_active_tokens(db: Session, user_id: int, purpose: str, now: datetime) -> None:
    """Expire all unexpired, unused tokens for a user+purpose."""
    db.execute(
        update(EmailVerification)
        .where(
            EmailVerification.user_id == user_id,
            EmailVerification.purpose == purpose,
            EmailVerification.used_at.is_(None),
            EmailVerification.expires_at > now,
        )
        .values(expires_at=now)
    )


def create_verification(
    db: Session,
    *,
    user_id: int,
    email: str,
    purpose: str,
    token_hash: str,
    expires_at: datetime,
    requested_ip: str | None,
    requested_user_agent: str | None,
) -> EmailVerification:
    row = EmailVerification(
        user_id=user_id,
        email=email,
        purpose=purpose,
        token_hash=token_hash,
        expires_at=expires_at,
        requested_ip=requested_ip,
        requested_user_agent=requested_user_agent,
    )
    db.add(row)
    return row


def get_verification_by_token_hash(
    db: Session, *, user_id: int, purpose: str, token_hash: str
) -> EmailVerification | None:
    return db.execute(
        select(EmailVerification)
        .where(
            EmailVerification.user_id == user_id,
            EmailVerification.purpose == purpose,
            EmailVerification.token_hash == token_hash,
            EmailVerification.used_at.is_(None),
        )
        .order_by(EmailVerification.created_at.desc())
    ).scalar_one_or_none()


def invalidate_other_tokens(
    db: Session, *, user_id: int, purpose: str, exclude_id: int, now: datetime
) -> None:
    """Expire all other unused tokens for a user+purpose except the given one."""
    db.execute(
        update(EmailVerification)
        .where(
            EmailVerification.user_id == user_id,
            EmailVerification.purpose == purpose,
            EmailVerification.id != exclude_id,
            EmailVerification.used_at.is_(None),
            EmailVerification.expires_at > now,
        )
        .values(expires_at=now)
    )
