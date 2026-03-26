"""expand candidates for admin management

Revision ID: f6a7b8c9d0e1
Revises: e6f7a8b9c0d1
Create Date: 2026-03-22
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f6a7b8c9d0e1"
down_revision: Union[str, Sequence[str], None] = "e6f7a8b9c0d1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("candidates", sa.Column("description", sa.Text(), nullable=True))
    op.add_column("candidates", sa.Column("photo_path", sa.String(length=500), nullable=True))
    op.add_column("candidates", sa.Column("symbol_path", sa.String(length=500), nullable=True))
    op.add_column(
        "candidates",
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "candidates",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
    )
    op.add_column(
        "candidates",
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.add_column(
        "candidates",
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    op.create_index("ix_candidates_display_order", "candidates", ["display_order"], unique=False)
    op.create_index("ix_candidates_is_active", "candidates", ["is_active"], unique=False)
    op.create_index("ix_candidates_created_at", "candidates", ["created_at"], unique=False)
    op.create_index("ix_candidates_updated_at", "candidates", ["updated_at"], unique=False)

    # Let application enforce explicit values for new writes while keeping backfill safety.
    op.alter_column("candidates", "display_order", server_default=None)
    op.alter_column("candidates", "is_active", server_default=None)


def downgrade() -> None:
    op.drop_index("ix_candidates_updated_at", table_name="candidates")
    op.drop_index("ix_candidates_created_at", table_name="candidates")
    op.drop_index("ix_candidates_is_active", table_name="candidates")
    op.drop_index("ix_candidates_display_order", table_name="candidates")

    op.drop_column("candidates", "updated_at")
    op.drop_column("candidates", "created_at")
    op.drop_column("candidates", "is_active")
    op.drop_column("candidates", "display_order")
    op.drop_column("candidates", "symbol_path")
    op.drop_column("candidates", "photo_path")
    op.drop_column("candidates", "description")
