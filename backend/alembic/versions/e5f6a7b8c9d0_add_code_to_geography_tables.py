"""Add code column to districts and constituencies

Adds a stable unique `code` identifier to districts (e.g. D01)
and constituencies (e.g. FC001) for canonical geography referencing.

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-04-09
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "e5f6a7b8c9d0"
down_revision = "d4e5f6a7b8c9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add code column to districts (nullable first, then populate, then set NOT NULL)
    op.add_column("districts", sa.Column("code", sa.String(10), nullable=True))
    op.add_column("constituencies", sa.Column("code", sa.String(10), nullable=True))

    # Create unique indexes
    op.create_index("ix_districts_code", "districts", ["code"], unique=True)
    op.create_index("ix_constituencies_code", "constituencies", ["code"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_constituencies_code", table_name="constituencies")
    op.drop_index("ix_districts_code", table_name="districts")
    op.drop_column("constituencies", "code")
    op.drop_column("districts", "code")
