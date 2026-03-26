"""expand elections for admin lifecycle

Revision ID: e6f7a8b9c0d1
Revises: c4d5e6f7a8b9
Create Date: 2026-03-22
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e6f7a8b9c0d1"
down_revision: Union[str, Sequence[str], None] = "c4d5e6f7a8b9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Backfill-safe column additions for existing election rows.
    op.add_column("elections", sa.Column("description", sa.Text(), nullable=True))
    op.add_column(
        "elections",
        sa.Column("election_type", sa.String(length=20), nullable=False, server_default="LOCAL"),
    )
    op.add_column("elections", sa.Column("created_by", sa.Integer(), nullable=True))
    op.add_column(
        "elections",
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.add_column(
        "elections",
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.add_column("elections", sa.Column("result_visible_from", sa.DateTime(), nullable=True))

    op.create_foreign_key(
        "fk_elections_created_by_users",
        "elections",
        "users",
        ["created_by"],
        ["id"],
    )
    op.create_index("ix_elections_created_by", "elections", ["created_by"], unique=False)
    op.create_index("ix_elections_created_at", "elections", ["created_at"], unique=False)
    op.create_index("ix_elections_updated_at", "elections", ["updated_at"], unique=False)

    # Ensure new writes set election_type explicitly after this migration.
    op.alter_column("elections", "election_type", server_default=None)


def downgrade() -> None:
    op.drop_index("ix_elections_updated_at", table_name="elections")
    op.drop_index("ix_elections_created_at", table_name="elections")
    op.drop_index("ix_elections_created_by", table_name="elections")
    op.drop_constraint("fk_elections_created_by_users", "elections", type_="foreignkey")

    op.drop_column("elections", "result_visible_from")
    op.drop_column("elections", "updated_at")
    op.drop_column("elections", "created_at")
    op.drop_column("elections", "created_by")
    op.drop_column("elections", "election_type")
    op.drop_column("elections", "description")
