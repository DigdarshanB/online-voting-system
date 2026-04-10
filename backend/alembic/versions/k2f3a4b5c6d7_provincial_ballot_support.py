"""provincial ballot support — make ballot.constituency_id nullable, add ballot.area_id

Revision ID: k2f3a4b5c6d7
Revises: j1e2f3a4b5c6
Create Date: 2025-01-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "k2f3a4b5c6d7"
down_revision = "j1e2f3a4b5c6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Make constituency_id nullable (federal ballots keep it; provincial ones set it to NULL)
    op.alter_column(
        "ballots",
        "constituency_id",
        existing_type=sa.Integer(),
        nullable=True,
    )

    # 2. Add area_id FK for provincial/local ballots (points to area_units.id)
    op.add_column(
        "ballots",
        sa.Column("area_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_ballots_area_unit",
        "ballots",
        "area_units",
        ["area_id"],
        ["id"],
    )
    op.create_index("ix_ballots_area_id", "ballots", ["area_id"])


def downgrade() -> None:
    op.drop_index("ix_ballots_area_id", table_name="ballots")
    op.drop_constraint("fk_ballots_area_unit", "ballots", type_="foreignkey")
    op.drop_column("ballots", "area_id")
    op.alter_column(
        "ballots",
        "constituency_id",
        existing_type=sa.Integer(),
        nullable=False,
    )
