"""add districts constituencies assignments and election_contests tables

Revision ID: a1f2b3c4d5e6
Revises: 0f534fd40195
Create Date: 2026-04-08
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "a1f2b3c4d5e6"
down_revision = "0f534fd40195"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # -- districts --
    op.create_table(
        "districts",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(120), nullable=False, unique=True),
        sa.Column("name_ne", sa.String(120), nullable=True),
        sa.Column("province_number", sa.Integer, nullable=False, index=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )

    # -- constituencies --
    op.create_table(
        "constituencies",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("name_ne", sa.String(160), nullable=True),
        sa.Column("constituency_number", sa.Integer, nullable=False),
        sa.Column(
            "district_id",
            sa.Integer,
            sa.ForeignKey("districts.id", name="fk_constituencies_district"),
            nullable=False,
            index=True,
        ),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("district_id", "constituency_number", name="uq_district_constituency"),
    )

    # -- voter_constituency_assignments --
    op.create_table(
        "voter_constituency_assignments",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column(
            "voter_id",
            sa.Integer,
            sa.ForeignKey("users.id", name="fk_vca_voter"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "constituency_id",
            sa.Integer,
            sa.ForeignKey("constituencies.id", name="fk_vca_constituency"),
            nullable=False,
            index=True,
        ),
        sa.Column("assigned_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("voter_id", name="uq_one_constituency_per_voter"),
    )

    # -- election_contests --
    op.create_table(
        "election_contests",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column(
            "election_id",
            sa.Integer,
            sa.ForeignKey("elections.id", name="fk_ec_election"),
            nullable=False,
            index=True,
        ),
        sa.Column("contest_type", sa.String(20), nullable=False, index=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("seat_count", sa.Integer, nullable=False),
        sa.Column(
            "constituency_id",
            sa.Integer,
            sa.ForeignKey("constituencies.id", name="fk_ec_constituency"),
            nullable=True,
            index=True,
        ),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint(
            "election_id", "contest_type", "constituency_id",
            name="uq_election_contest_slot",
        ),
    )


def downgrade() -> None:
    op.drop_table("election_contests")
    op.drop_table("voter_constituency_assignments")
    op.drop_table("constituencies")
    op.drop_table("districts")
