from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.party import Party


def get_by_id(db: Session, party_id: int) -> Party | None:
    return db.execute(
        select(Party).where(Party.id == party_id)
    ).scalar_one_or_none()


def get_by_name(db: Session, name: str) -> Party | None:
    return db.execute(
        select(Party).where(Party.name == name)
    ).scalar_one_or_none()


def get_by_abbreviation(db: Session, abbreviation: str) -> Party | None:
    return db.execute(
        select(Party).where(Party.abbreviation == abbreviation)
    ).scalar_one_or_none()


def list_all(
    db: Session, *, limit: int = 200, offset: int = 0, active_only: bool = False,
) -> list[Party]:
    q = select(Party).order_by(Party.name)
    if active_only:
        q = q.where(Party.is_active == True)  # noqa: E712
    return list(db.execute(q.limit(limit).offset(offset)).scalars().all())


def count(db: Session, *, active_only: bool = False) -> int:
    q = select(func.count()).select_from(Party)
    if active_only:
        q = q.where(Party.is_active == True)  # noqa: E712
    return db.execute(q).scalar_one()


def create(db: Session, party: Party) -> Party:
    db.add(party)
    db.flush()
    return party


def delete(db: Session, party: Party) -> None:
    db.delete(party)
    db.flush()
