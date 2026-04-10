"""add province_code to elections

Revision ID: i0d1e2f3a4b5
Revises: h9c0d1e2f3a4
Create Date: 2026-04-10

Adds a `province_code` column to the elections table.
This column scopes a PROVINCIAL election to a specific province
(stored as the area_units.code value, e.g. "P1").
NULL for FEDERAL and LOCAL elections.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "i0d1e2f3a4b5"
down_revision: Union[str, Sequence[str], None] = "h9c0d1e2f3a4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "elections",
        sa.Column("province_code", sa.String(length=10), nullable=True),
    )
    op.create_index("ix_elections_province_code", "elections", ["province_code"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_elections_province_code", table_name="elections")
    op.drop_column("elections", "province_code")
