"""add_admin_approval_fields

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-03-05

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("approved_at", sa.DateTime(), nullable=True))
    op.add_column("users", sa.Column("rejection_reason", sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "rejection_reason")
    op.drop_column("users", "approved_at")
