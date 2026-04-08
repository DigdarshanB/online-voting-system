from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.election import Election
from app.models.election_contest import ElectionContest


# ── Counts (used by dashboard) ──────────────────────────────────

def count_by_status(db: Session, status: str) -> int:
    return db.execute(
        select(func.count()).select_from(Election).where(Election.status == status)
    ).scalar_one()


def count_grouped_by_status(db: Session) -> dict[str, int]:
    rows = db.execute(
        select(Election.status, func.count(Election.id)).group_by(Election.status)
    ).all()
    return {
        (str(status).upper() if status is not None else ""): int(count or 0)
        for status, count in rows
    }


# ── CRUD ────────────────────────────────────────────────────────

def get_by_id(db: Session, election_id: int) -> Election | None:
    return db.execute(
        select(Election).where(Election.id == election_id)
    ).scalar_one_or_none()


def list_all(db: Session, *, limit: int = 100, offset: int = 0) -> list[Election]:
    return list(
        db.execute(
            select(Election)
            .order_by(Election.created_at.desc())
            .limit(limit)
            .offset(offset)
        ).scalars().all()
    )


def create(db: Session, election: Election) -> Election:
    db.add(election)
    db.flush()
    return election


def delete(db: Session, election: Election) -> None:
    db.delete(election)
    db.flush()


# ── Contest helpers ─────────────────────────────────────────────

def count_contests(db: Session, election_id: int) -> dict[str, int]:
    """Return {contest_type: count} for an election."""
    rows = db.execute(
        select(ElectionContest.contest_type, func.count(ElectionContest.id))
        .where(ElectionContest.election_id == election_id)
        .group_by(ElectionContest.contest_type)
    ).all()
    return {ct: int(cnt) for ct, cnt in rows}


def get_contests(db: Session, election_id: int) -> list[ElectionContest]:
    return list(
        db.execute(
            select(ElectionContest)
            .where(ElectionContest.election_id == election_id)
            .order_by(ElectionContest.contest_type, ElectionContest.id)
        ).scalars().all()
    )


def delete_contests(db: Session, election_id: int) -> int:
    """Delete all contests for an election. Returns count deleted."""
    contests = get_contests(db, election_id)
    for c in contests:
        db.delete(c)
    db.flush()
    return len(contests)
