from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models.user import User


def get_user_by_id(db: Session, user_id: int) -> User | None:
    return db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.execute(select(User).where(User.email == email)).scalar_one_or_none()


def get_user_by_citizenship_normalized(db: Session, normalized: str) -> User | None:
    return db.execute(
        select(User).where(User.citizenship_no_normalized == normalized)
    ).scalar_one_or_none()


def create_user(db: Session, *, email: str | None, full_name: str, phone_number: str,
                citizenship_no_raw: str, citizenship_no_normalized: str,
                hashed_password: str, role: str, status: str) -> User:
    """Insert a new user row and flush (assign PK) without committing.

    The caller is responsible for calling ``db.commit()`` once all related
    rows (e.g. email-verification tokens) are ready, so everything is
    committed atomically.
    """
    user = User(
        email=email,
        full_name=full_name,
        phone_number=phone_number,
        citizenship_no_raw=citizenship_no_raw,
        citizenship_no_normalized=citizenship_no_normalized,
        hashed_password=hashed_password,
        role=role,
        status=status,
    )
    db.add(user)
    db.flush()
    db.refresh(user)
    return user


def list_users_by_role_and_statuses(db: Session, role: str, statuses: list[str]) -> list[User]:
    return db.execute(
        select(User).where(User.role == role, User.status.in_(statuses))
    ).scalars().all()


def list_users_by_role_and_status(db: Session, role: str, status: str) -> list[User]:
    return db.execute(
        select(User).where(User.role == role, User.status == status)
    ).scalars().all()
