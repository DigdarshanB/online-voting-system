"""add totp_secret to pending_voter_registrations

Revision ID: a2b3c4d5e6f7
Revises: 6a8b4ba9c683
Create Date: 2026-04-08
"""
from alembic import op
import sqlalchemy as sa

revision = "a2b3c4d5e6f7"
down_revision = "6a8b4ba9c683"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "pending_voter_registrations",
        sa.Column("totp_secret", sa.String(255), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("pending_voter_registrations", "totp_secret")
