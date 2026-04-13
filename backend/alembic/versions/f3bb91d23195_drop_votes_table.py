"""Drop votes table — superseded by ballots + ballot_entries.

Verified empty before removal. All queries migrated to Ballot-based counts.

Revision ID: f3bb91d23195
Revises: e1f2a3b4c5d6
Create Date: 2026-04-13
"""
from alembic import op

revision = "f3bb91d23195"
down_revision = "e1f2a3b4c5d6"
branch_labels = None
depends_on = None


def upgrade():
    op.drop_index("ix_votes_voter_id", table_name="votes")
    op.drop_index("ix_votes_election_id", table_name="votes")
    op.drop_table("votes")


def downgrade():
    import sqlalchemy as sa

    op.create_table(
        "votes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("election_id", sa.Integer(), sa.ForeignKey("elections.id"), nullable=False),
        sa.Column("voter_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("encrypted_vote", sa.LargeBinary(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("election_id", "voter_id", name="uq_vote_once_per_election"),
    )
    op.create_index("ix_votes_election_id", "votes", ["election_id"])
    op.create_index("ix_votes_voter_id", "votes", ["voter_id"])
