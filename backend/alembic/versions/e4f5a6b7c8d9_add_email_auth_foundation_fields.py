"""add_email_auth_foundation_fields

Revision ID: e4f5a6b7c8d9
Revises: d3e4f5a6b7c8
Create Date: 2026-03-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e4f5a6b7c8d9"
down_revision: Union[str, Sequence[str], None] = "d3e4f5a6b7c8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add fields used by email-based recovery and session invalidation.
    op.add_column("users", sa.Column("email_verified_at", sa.DateTime(), nullable=True))
    op.add_column(
        "users",
        sa.Column("token_version", sa.Integer(), nullable=False, server_default="0"),
    )

    # Normalize existing non-null emails to lowercase.
    op.execute(sa.text("UPDATE users SET email = LOWER(email) WHERE email IS NOT NULL"))

    # Guard against case-collisions before relying on normalized uniqueness.
    bind = op.get_bind()
    duplicate_rows = bind.execute(
        sa.text(
            """
            SELECT LOWER(email) AS normalized_email, COUNT(*) AS cnt
            FROM users
            WHERE email IS NOT NULL
            GROUP BY LOWER(email)
            HAVING COUNT(*) > 1
            """
        )
    ).fetchall()
    if duplicate_rows:
        duplicates = ", ".join(row[0] for row in duplicate_rows)
        raise RuntimeError(
            "Duplicate emails found after normalization: "
            f"{duplicates}. Resolve duplicates and rerun migration."
        )

    # Keep server default only for migration/backfill compatibility.
    op.alter_column("users", "token_version", server_default=None)


def downgrade() -> None:
    op.drop_column("users", "token_version")
    op.drop_column("users", "email_verified_at")
