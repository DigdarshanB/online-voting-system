"""Fix election_contests unique constraint to use area_id

Replace uq_election_contest_slot (election_id, contest_type, constituency_id)
with uq_election_contest_slot_v2 (election_id, contest_type, area_id).
The old constraint fails for local contests where constituency_id is NULL.

Revision ID: g8b9c0d1e2f3
Revises: f7a8b9c0d1e2
Create Date: 2026-04-10
"""
from alembic import op

revision = "g8b9c0d1e2f3"
down_revision = "f7a8b9c0d1e2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop the old constraint (may not exist in all envs, so use batch)
    with op.batch_alter_table("election_contests") as batch_op:
        batch_op.drop_constraint("uq_election_contest_slot", type_="unique")
        batch_op.create_unique_constraint(
            "uq_election_contest_slot_v2",
            ["election_id", "contest_type", "area_id"],
        )


def downgrade() -> None:
    with op.batch_alter_table("election_contests") as batch_op:
        batch_op.drop_constraint("uq_election_contest_slot_v2", type_="unique")
        batch_op.create_unique_constraint(
            "uq_election_contest_slot",
            ["election_id", "contest_type", "constituency_id"],
        )
