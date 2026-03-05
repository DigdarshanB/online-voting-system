"""harden_admin_invites_schema

Revision ID: a1b2c3d4e5f6
Revises: de30b9dc25e3
Create Date: 2026-03-05

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "de30b9dc25e3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # recipient_identifier — safe default for any existing rows
    op.add_column(
        "admin_invites",
        sa.Column(
            "recipient_identifier",
            sa.String(length=255),
            nullable=False,
            server_default="unknown",
        ),
    )
    # Remove the temporary server_default so future inserts must supply it
    op.alter_column(
        "admin_invites",
        "recipient_identifier",
        server_default=None,
    )

    # status with server_default ISSUED
    op.add_column(
        "admin_invites",
        sa.Column(
            "status",
            sa.String(length=20),
            nullable=False,
            server_default="ISSUED",
        ),
    )

    # revoked_at
    op.add_column(
        "admin_invites",
        sa.Column("revoked_at", sa.DateTime(), nullable=True),
    )

    # Index on status for quick filtering
    op.create_index(
        op.f("ix_admin_invites_status"), "admin_invites", ["status"]
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_admin_invites_status"), table_name="admin_invites")
    op.drop_column("admin_invites", "revoked_at")
    op.drop_column("admin_invites", "status")
    op.drop_column("admin_invites", "recipient_identifier")
