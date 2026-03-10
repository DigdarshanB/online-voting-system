"""add_face_verification_fields

Revision ID: d3e4f5a6b7c8
Revises: c2a4260af43c
Create Date: 2026-03-10 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd3e4f5a6b7c8'
down_revision: Union[str, Sequence[str], None] = 'c2a4260af43c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('face_image_path', sa.String(length=500), nullable=True))
    op.add_column('users', sa.Column('face_uploaded_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'face_uploaded_at')
    op.drop_column('users', 'face_image_path')
