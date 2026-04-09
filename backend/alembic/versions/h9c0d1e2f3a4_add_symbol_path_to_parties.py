"""Add symbol_path to parties table

Adds a VARCHAR(500) nullable column for storing party election symbol image path.

Revision ID: h9c0d1e2f3a4
Revises: g8b9c0d1e2f3
Create Date: 2026-04-10
"""
from alembic import op
import sqlalchemy as sa

revision = "h9c0d1e2f3a4"
down_revision = "g8b9c0d1e2f3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("parties", sa.Column("symbol_path", sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column("parties", "symbol_path")
