"""
Seed a single Super Admin user from environment variables.

Usage (with venv active, from backend/):
    SUPER_ADMIN_CITIZENSHIP="01-01-01-00001" \
    SUPER_ADMIN_PHONE="9800000000" \
    SUPER_ADMIN_FULL_NAME="Super Admin" \
    SUPER_ADMIN_PASSWORD="SuperSecret123" \
    python -m app.scripts.seed_super_admin

Idempotent: safe to run multiple times.
"""

import os
import sys

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.user import User
from app.core.security import hash_password
from app.utils.citizenship import normalize_citizenship_number


def seed() -> None:
    citizenship_raw = os.environ.get("SUPER_ADMIN_CITIZENSHIP", "").strip()
    phone = os.environ.get("SUPER_ADMIN_PHONE", "").strip()
    full_name = os.environ.get("SUPER_ADMIN_FULL_NAME", "").strip()
    password = os.environ.get("SUPER_ADMIN_PASSWORD", "").strip()

    if not all([citizenship_raw, phone, full_name, password]):
        print("ERROR: All SUPER_ADMIN_* env vars must be set.")
        print("  SUPER_ADMIN_CITIZENSHIP, SUPER_ADMIN_PHONE,")
        print("  SUPER_ADMIN_FULL_NAME, SUPER_ADMIN_PASSWORD")
        sys.exit(1)

    normalized = normalize_citizenship_number(citizenship_raw)

    db = SessionLocal()
    try:
        existing = db.execute(
            select(User).where(User.citizenship_no_normalized == normalized)
        ).scalar_one_or_none()

        if existing:
            print(f"Super admin already exists (id={existing.id}). No changes made.")
            return

        user = User(
            full_name=full_name,
            phone_number=phone,
            citizenship_no_raw=citizenship_raw,
            citizenship_no_normalized=normalized,
            hashed_password=hash_password(password),
            role="super_admin",
            status="ACTIVE",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"Super admin created (id={user.id}, citizenship={normalized}).")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
