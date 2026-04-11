"""Widen ballot_entry.ballot_type and swap unique constraint for local elections.

Local ballots have 6 contest types (e.g. WARD_WOMAN_MEMBER = 17 chars) and
need the unique constraint on (ballot_id, contest_id) instead of
(ballot_id, ballot_type) to support one entry per contest.

Revision ID: m4b5c6d7e8f9
Revises: l3a4b5c6d7e8
Create Date: 2026-04-11
"""
from alembic import op
import sqlalchemy as sa

revision = "m4b5c6d7e8f9"
down_revision = "l3a4b5c6d7e8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Widen ballot_type from VARCHAR(10) to VARCHAR(20)
    op.alter_column(
        "ballot_entries",
        "ballot_type",
        existing_type=sa.String(10),
        type_=sa.String(20),
        existing_nullable=False,
    )

    # 2. Drop old unique constraint (ballot_id, ballot_type)
    op.drop_constraint(
        "uq_one_entry_per_ballot_type", "ballot_entries", type_="unique"
    )

    # 3. Add new unique constraint (ballot_id, contest_id)
    op.create_unique_constraint(
        "uq_one_entry_per_ballot_contest",
        "ballot_entries",
        ["ballot_id", "contest_id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_one_entry_per_ballot_contest", "ballot_entries", type_="unique"
    )
    op.create_unique_constraint(
        "uq_one_entry_per_ballot_type",
        "ballot_entries",
        ["ballot_id", "ballot_type"],
    )
    op.alter_column(
        "ballot_entries",
        "ballot_type",
        existing_type=sa.String(20),
        type_=sa.String(10),
        existing_nullable=False,
    )
