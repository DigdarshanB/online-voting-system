"""add dual ballot tables

Revision ID: c3d4e5f6a7b8
Revises: a2b3c4d5e6f7
Create Date: 2026-04-08
"""
from alembic import op
import sqlalchemy as sa

revision = "c3d4e5f6a7b8"
down_revision = "a2b3c4d5e6f7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "ballots",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "election_id",
            sa.Integer(),
            sa.ForeignKey("elections.id", name="fk_ballots_election"),
            nullable=False,
        ),
        sa.Column(
            "voter_id",
            sa.Integer(),
            sa.ForeignKey("users.id", name="fk_ballots_voter"),
            nullable=False,
        ),
        sa.Column(
            "constituency_id",
            sa.Integer(),
            sa.ForeignKey("constituencies.id", name="fk_ballots_constituency"),
            nullable=False,
        ),
        sa.Column(
            "cast_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint(
            "election_id", "voter_id", name="uq_one_ballot_per_voter_per_election"
        ),
    )
    op.create_index("ix_ballots_election_id", "ballots", ["election_id"])
    op.create_index("ix_ballots_voter_id", "ballots", ["voter_id"])

    op.create_table(
        "ballot_entries",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "ballot_id",
            sa.Integer(),
            sa.ForeignKey("ballots.id", name="fk_be_ballot"),
            nullable=False,
        ),
        sa.Column(
            "contest_id",
            sa.Integer(),
            sa.ForeignKey("election_contests.id", name="fk_be_contest"),
            nullable=False,
        ),
        sa.Column("ballot_type", sa.String(10), nullable=False),
        sa.Column("encrypted_choice", sa.LargeBinary(), nullable=False),
        sa.Column("nonce", sa.LargeBinary(), nullable=False),
        sa.UniqueConstraint(
            "ballot_id", "ballot_type", name="uq_one_entry_per_ballot_type"
        ),
    )
    op.create_index("ix_ballot_entries_ballot_id", "ballot_entries", ["ballot_id"])
    op.create_index("ix_ballot_entries_contest_id", "ballot_entries", ["contest_id"])


def downgrade() -> None:
    op.drop_table("ballot_entries")
    op.drop_table("ballots")
