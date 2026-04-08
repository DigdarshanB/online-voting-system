"""Repository for pending voter registrations – DB queries only, no business logic."""

from datetime import datetime

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models.pending_voter_registration import PendingVoterRegistration


def get_by_id(db: Session, reg_id: int) -> PendingVoterRegistration | None:
    return db.execute(
        select(PendingVoterRegistration).where(PendingVoterRegistration.id == reg_id)
    ).scalar_one_or_none()


def get_by_email(db: Session, email: str) -> PendingVoterRegistration | None:
    """Return the most recent non-expired/non-rejected pending registration for an email."""
    return db.execute(
        select(PendingVoterRegistration)
        .where(
            PendingVoterRegistration.email == email,
            PendingVoterRegistration.status.notin_(("APPROVED", "REJECTED", "EXPIRED")),
        )
        .order_by(PendingVoterRegistration.submitted_at.desc())
    ).scalar_one_or_none()


def get_by_citizenship_normalized(
    db: Session, normalized: str,
) -> PendingVoterRegistration | None:
    """Return the most recent active pending registration for a citizenship number."""
    return db.execute(
        select(PendingVoterRegistration)
        .where(
            PendingVoterRegistration.citizenship_no_normalized == normalized,
            PendingVoterRegistration.status.notin_(("APPROVED", "REJECTED", "EXPIRED")),
        )
        .order_by(PendingVoterRegistration.submitted_at.desc())
    ).scalar_one_or_none()


def get_by_email_token_hash(db: Session, token_hash: str) -> PendingVoterRegistration | None:
    return db.execute(
        select(PendingVoterRegistration)
        .where(
            PendingVoterRegistration.email_token_hash == token_hash,
            PendingVoterRegistration.email_verified_at.is_(None),
        )
    ).scalar_one_or_none()


def create(db: Session, **kwargs) -> PendingVoterRegistration:
    reg = PendingVoterRegistration(**kwargs)
    db.add(reg)
    db.flush()
    db.refresh(reg)
    return reg


def list_by_status(db: Session, status: str) -> list[PendingVoterRegistration]:
    return list(
        db.execute(
            select(PendingVoterRegistration)
            .where(PendingVoterRegistration.status == status)
            .order_by(PendingVoterRegistration.submitted_at.desc())
        ).scalars().all()
    )


def list_pending_review(db: Session) -> list[PendingVoterRegistration]:
    return list_by_status(db, "PENDING_REVIEW")


def expire_stale(db: Session, cutoff: datetime) -> int:
    """Mark old unverified registrations as EXPIRED. Returns count affected."""
    result = db.execute(
        update(PendingVoterRegistration)
        .where(
            PendingVoterRegistration.status.in_(("PENDING_EMAIL", "PENDING_TOTP")),
            PendingVoterRegistration.submitted_at < cutoff,
        )
        .values(status="EXPIRED")
    )
    return result.rowcount
