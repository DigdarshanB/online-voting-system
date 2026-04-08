from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.election import Election


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
