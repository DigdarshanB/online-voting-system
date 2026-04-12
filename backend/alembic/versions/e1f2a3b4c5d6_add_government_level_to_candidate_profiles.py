"""add government_level to candidate_profiles

Revision ID: e1f2a3b4c5d6
Revises: o6d7e8f9a0b1
Create Date: 2026-04-12
"""
from alembic import op
import sqlalchemy as sa

revision = "e1f2a3b4c5d6"
down_revision = "o6d7e8f9a0b1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add government_level column; existing rows default to 'FEDERAL' since only
    # federal elections were active before this migration.
    op.add_column(
        "candidate_profiles",
        sa.Column(
            "government_level",
            sa.String(length=20),
            nullable=False,
            server_default="FEDERAL",
        ),
    )
    op.create_index(
        "ix_cp_government_level",
        "candidate_profiles",
        ["government_level"],
    )


def downgrade() -> None:
    op.drop_index("ix_cp_government_level", table_name="candidate_profiles")
    op.drop_column("candidate_profiles", "government_level")
