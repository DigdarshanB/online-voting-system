"""
Legacy superadmin recovery utility.

Purpose:
- Recover pre-email superadmin accounts that now fail admin portal progression
  because frontend TOTP bootstrap requires `email_verified=true`.
- Set/update email, mark email as verified, and optionally reset password.

Safety:
- Targets account by citizenship number (same identifier used by admin login).
- Restricts updates to role=super_admin only.
- Uses project utilities for normalization and password hashing.
- Increments token_version to invalidate older JWT sessions after recovery.

Usage (from backend/):
    python -m app.scripts.recover_legacy_superadmin \
      --citizenship "01-01-01-00001" \
      --email "superadmin@yourdomain.com"

Optional password reset:
    python -m app.scripts.recover_legacy_superadmin \
      --citizenship "01-01-01-00001" \
      --email "superadmin@yourdomain.com" \
      --new-password "NewStrongPass123"
"""

from __future__ import annotations

import argparse
import re
import sys
from datetime import datetime, timezone

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.user import User
from app.utils.citizenship import normalize_citizenship_number
from app.utils.email import normalize_email

_PASSWORD_UPPER_RE = re.compile(r"[A-Z]")
_PASSWORD_LOWER_RE = re.compile(r"[a-z]")
_PASSWORD_DIGIT_RE = re.compile(r"\d")


def _validate_password_policy(password: str) -> str | None:
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
        description=(
            "Recover a legacy superadmin by setting email + verified state, "
            "with optional password reset."
        )
    )
    parser.add_argument(
        "--citizenship",
        required=True,
        help="Superadmin citizenship identifier used by /auth/admin/login.",
    )
    parser.add_argument(
        "--email",
        required=True,
        help="Email to assign to the superadmin account.",
    )
    parser.add_argument(
        "--new-password",
        help="Optional: set a new password using project hashing utility.",
    )
    parser.add_argument(
        "--leave-unverified",
        action="store_true",
        help="Optional: do not set email_verified_at (not recommended for legacy recovery).",
    )
    return parser.parse_args()


def main() -> None:
    args = _parse_args()

    try:
        citizenship_normalized = normalize_citizenship_number(args.citizenship)
    except Exception as exc:
        print(f"ERROR: Invalid citizenship number format: {exc}")
        sys.exit(2)

    try:
        normalized_email = normalize_email(args.email)
    except Exception as exc:
        print(f"ERROR: Invalid email: {exc}")
        sys.exit(2)

    if args.new_password:
        policy_error = _validate_password_policy(args.new_password)
        if policy_error:
            print(f"ERROR: {policy_error}")
            sys.exit(2)

    db = SessionLocal()
    try:
        user = db.execute(
            select(User).where(User.citizenship_no_normalized == citizenship_normalized)
        ).scalar_one_or_none()

        if not user:
            print("ERROR: No account found for the provided citizenship number.")
            sys.exit(1)

        if user.role != "super_admin":
            print(
                "ERROR: Recovery utility is restricted to super_admin only "
                f"(found role={user.role})."
            )
            sys.exit(1)

        email_owner = db.execute(
            select(User).where(User.email == normalized_email, User.id != user.id)
        ).scalar_one_or_none()
        if email_owner:
            print(
                "ERROR: Email is already used by another account "
                f"(user_id={email_owner.id}, role={email_owner.role})."
            )
            sys.exit(1)

        old_email = user.email
        old_verified = user.email_verified_at
        old_token_version = user.token_version

        user.email = normalized_email
        if not args.leave_unverified:
            user.email_verified_at = datetime.now(timezone.utc)

        if args.new_password:
            user.hashed_password = hash_password(args.new_password)

        user.token_version += 1
        db.commit()
        db.refresh(user)

        print("SUCCESS: Legacy superadmin recovery completed.")
        print(f"User id: {user.id}")
        print(f"Role: {user.role}")
        print(f"Citizenship (normalized): {user.citizenship_no_normalized}")
        print(f"Email: {old_email!r} -> {user.email!r}")
        print(f"Email verified_at: {old_verified!r} -> {user.email_verified_at!r}")
        print(f"Token version: {old_token_version} -> {user.token_version}")
        if args.new_password:
            print("Password: updated")
        else:
            print("Password: unchanged")
    except Exception as exc:
        db.rollback()
        print(f"ERROR: Recovery failed: {exc}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
