import hashlib

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.admin_invite import AdminInvite


def get_invite_by_id(db: Session, invite_id: int) -> AdminInvite | None:
    return db.execute(
        select(AdminInvite).where(AdminInvite.id == invite_id)
    ).scalar_one_or_none()


def get_invite_by_code_hash(db: Session, code_hash: str) -> AdminInvite | None:
    return db.execute(
        select(AdminInvite).where(AdminInvite.code_hash == code_hash)
    ).scalar_one_or_none()


def list_all_invites(db: Session) -> list[AdminInvite]:
    return db.execute(
        select(AdminInvite).order_by(AdminInvite.created_at.desc())
    ).scalars().all()


def get_active_invite_for_recipient(db: Session, recipient: str, now) -> AdminInvite | None:
    return db.execute(
        select(AdminInvite)
        .where(
            AdminInvite.recipient_identifier == recipient,
            AdminInvite.status.in_(["ISSUED", "SENT"]),
            AdminInvite.expires_at > now,
        )
    ).scalar_one_or_none()


def create_invite(
    db: Session,
    *,
    code_hash: str,
    recipient_identifier: str,
    expires_at,
    created_by: int,
) -> AdminInvite:
    invite = AdminInvite(
        code_hash=code_hash,
        recipient_identifier=recipient_identifier,
        status="ISSUED",
        expires_at=expires_at,
        created_by=created_by,
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)
    return invite


def delete_invite(db: Session, invite: AdminInvite) -> None:
    db.delete(invite)
    db.commit()
