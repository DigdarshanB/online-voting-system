from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.vote import Vote


def count_all(db: Session) -> int:
    return db.execute(select(func.count()).select_from(Vote)).scalar_one()


def count_by_voter(db: Session, voter_id: int) -> int:
    return db.execute(
        select(func.count(Vote.id)).where(Vote.voter_id == voter_id)
    ).scalar() or 0
