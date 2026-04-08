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
    # NO-OP: The candidates table was intentionally removed from the project scope.
    # Original operations targeted the candidates table which no longer exists.
    # This migration is kept as a no-op to preserve the revision chain integrity.
    pass


def downgrade() -> None:
    # NO-OP: See upgrade() comment above.
    pass
