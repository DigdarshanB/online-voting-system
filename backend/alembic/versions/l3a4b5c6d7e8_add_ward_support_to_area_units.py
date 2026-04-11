"""Add ward support to area_units table.

Additive-only migration:
- Widens area_units.code from VARCHAR(10) to VARCHAR(16) for ward codes (e.g. LB0001-W01)
- Widens area_units.parent_code from VARCHAR(10) to VARCHAR(16) to match
- Adds area_units.ward_number INTEGER nullable column

No existing rows are modified. Existing federal/provincial data is unaffected.

Revision ID: l3a4b5c6d7e8
Revises: k2f3a4b5c6d7
Create Date: 2026-04-11
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = "l3a4b5c6d7e8"
down_revision = "k2f3a4b5c6d7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Widen code column to accommodate ward codes like "LB0001-W01" (12 chars)
    op.alter_column(
        "area_units", "code",
        existing_type=sa.String(10),
        type_=sa.String(16),
        existing_nullable=False,
    )
    # Widen parent_code to match
    op.alter_column(
        "area_units", "parent_code",
        existing_type=sa.String(10),
        type_=sa.String(16),
        existing_nullable=True,
    )
    # Add ward_number column (null for non-WARD units)
    op.add_column(
        "area_units",
        sa.Column("ward_number", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("area_units", "ward_number")
    op.alter_column(
        "area_units", "parent_code",
        existing_type=sa.String(16),
        type_=sa.String(10),
        existing_nullable=True,
    )
    op.alter_column(
        "area_units", "code",
        existing_type=sa.String(16),
        type_=sa.String(10),
        existing_nullable=False,
    )
