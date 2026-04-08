from datetime import datetime

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models.password_reset_code import PasswordResetCode


def invalidate_active_codes(db: Session, user_id: int, now: datetime) -> None:
    """Expire all unexpired, unused reset codes for a user."""
    db.execute(
        update(PasswordResetCode)
        .where(
            PasswordResetCode.user_id == user_id,
            PasswordResetCode.used_at.is_(None),
            PasswordResetCode.expires_at > now,
        )
        .values(expires_at=now)
    )


def create_reset_code(
    db: Session,
    *,
    user_id: int,
    code_hash: str,
    expires_at: datetime,
    requested_ip: str | None,
    requested_user_agent: str | None,
) -> PasswordResetCode:
    row = PasswordResetCode(
        user_id=user_id,
        code_hash=code_hash,
        expires_at=expires_at,
        requested_ip=requested_ip,
        requested_user_agent=requested_user_agent,
    )
    db.add(row)
    return row


def get_active_code_by_hash(
    db: Session, *, user_id: int, code_hash: str
) -> PasswordResetCode | None:
    return db.execute(
        select(PasswordResetCode)
        .where(
            PasswordResetCode.user_id == user_id,
            PasswordResetCode.code_hash == code_hash,
            PasswordResetCode.used_at.is_(None),
        )
        .order_by(PasswordResetCode.created_at.desc())
    ).scalar_one_or_none()


def invalidate_other_codes(
    db: Session, *, user_id: int, exclude_id: int, now: datetime
) -> None:
    """Expire all other unused codes for a user except the given one."""
    db.execute(
        update(PasswordResetCode)
        .where(
            PasswordResetCode.user_id == user_id,
            PasswordResetCode.id != exclude_id,
            PasswordResetCode.used_at.is_(None),
            PasswordResetCode.expires_at > now,
        )
        .values(expires_at=now)
    )
