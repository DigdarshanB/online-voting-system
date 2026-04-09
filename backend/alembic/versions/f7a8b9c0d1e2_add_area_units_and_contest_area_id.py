"""Add area_units table and area_id to election_contests

Creates unified geography hierarchy table and adds generic area_id
foreign key to election_contests for multi-level contest targeting.
The existing constituency_id column is preserved for backward
compatibility during migration.

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-04-09
"""
from alembic import op
import sqlalchemy as sa

revision = "f7a8b9c0d1e2"
down_revision = "e5f6a7b8c9d0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Create area_units table
    op.create_table(
        "area_units",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("code", sa.String(10), nullable=False, unique=True, index=True),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("name_ne", sa.String(160), nullable=True),
        sa.Column("category", sa.String(30), nullable=False, index=True),
        sa.Column("parent_code", sa.String(10), nullable=True, index=True),
        sa.Column("province_number", sa.Integer, nullable=True, index=True),
        sa.Column(
            "created_at",
            sa.DateTime,
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    # 2. Add area_id column to election_contests (nullable, no FK constraint yet)
    op.add_column(
        "election_contests",
        sa.Column("area_id", sa.Integer, nullable=True, index=True),
    )


def downgrade() -> None:
    op.drop_column("election_contests", "area_id")
    op.drop_table("area_units")
