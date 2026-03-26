"""
Reset an admin/super_admin password by citizenship number.

Why this script exists:
- Passwords are stored as one-way bcrypt hashes, so the original password cannot be recovered.
- Safe recovery means setting a new password hash, not decrypting the old value.
- This script performs a minimal, controlled reset for local/dev recovery and operational break-glass use.

Usage (from backend/):
    python -m app.scripts.reset_admin_password --citizenship "01-01-01-00001"

Optional flags:
    --new-password "StrongPass123"   # if omitted, prompt securely
    --allow-admin                     # permit role=admin in addition to super_admin

Defaults to super_admin only for safer operation.
"""

from __future__ import annotations

import argparse
import getpass
import re
import sys

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.user import User
from app.utils.citizenship import normalize_citizenship_number

_PASSWORD_UPPER_RE = re.compile(r"[A-Z]")
_PASSWORD_LOWER_RE = re.compile(r"[a-z]")
_PASSWORD_DIGIT_RE = re.compile(r"\d")


def _validate_password_policy(password: str) -> str | None:
    """Mirror API password constraints to avoid setting weak/incompatible passwords."""
    if len(password) < 8 or len(password) > 128:
        return "Password must be 8-128 characters long."
    if not _PASSWORD_UPPER_RE.search(password):
        return "Password must include at least one uppercase letter."
    if not _PASSWORD_LOWER_RE.search(password):
        return "Password must include at least one lowercase letter."
    if not _PASSWORD_DIGIT_RE.search(password):
        return "Password must include at least one number."
    return None


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Reset admin/super_admin password by citizenship identifier.",
    )
    parser.add_argument(
        "--citizenship",
        required=True,
        help="Target account citizenship number (same identifier used by /auth/admin/login).",
    )
    parser.add_argument(
        "--new-password",
        help="New plaintext password (omit to enter securely via prompt).",
    )
    parser.add_argument(
        "--allow-admin",
        action="store_true",
        help="Allow reset for role=admin accounts. By default, only super_admin is allowed.",
    )
    return parser.parse_args()


def _read_new_password(cli_value: str | None) -> str:
    if cli_value:
        return cli_value

    pw1 = getpass.getpass("Enter new password: ")
    pw2 = getpass.getpass("Confirm new password: ")
    if pw1 != pw2:
        print("ERROR: Passwords do not match.")
        sys.exit(2)
    return pw1


def main() -> None:
    args = _parse_args()

    try:
        normalized = normalize_citizenship_number(args.citizenship)
    except Exception as exc:
        print(f"ERROR: Invalid citizenship number format: {exc}")
        sys.exit(2)

    new_password = _read_new_password(args.new_password)
    policy_error = _validate_password_policy(new_password)
    if policy_error:
        print(f"ERROR: {policy_error}")
        sys.exit(2)

    allowed_roles = {"super_admin"}
    if args.allow_admin:
        allowed_roles.add("admin")

    db = SessionLocal()
    try:
        user = db.execute(
            select(User).where(User.citizenship_no_normalized == normalized)
        ).scalar_one_or_none()

        if not user:
            print("ERROR: No user found for the provided citizenship number.")
            sys.exit(1)

        if user.role not in allowed_roles:
            allowed_str = ", ".join(sorted(allowed_roles))
            print(
                "ERROR: Target user role is not allowed for this reset "
                f"(found role={user.role}, allowed={allowed_str})."
            )
            sys.exit(1)

        user.hashed_password = hash_password(new_password)
        user.token_version += 1  # Invalidate all existing JWT sessions.
        db.commit()

        print("SUCCESS: Password reset completed.")
        print(f"User id: {user.id}")
        print(f"Role: {user.role}")
        print(f"Citizenship (normalized): {user.citizenship_no_normalized}")
        print(f"New token_version: {user.token_version}")
    except Exception as exc:
        db.rollback()
        print(f"ERROR: Password reset failed: {exc}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
