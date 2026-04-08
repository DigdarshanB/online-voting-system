"""add candidate management tables

Revision ID: b2c3d4e5f6a8
Revises: a1f2b3c4d5e6
Create Date: 2026-04-08
"""
from alembic import op
import sqlalchemy as sa

revision = "b2c3d4e5f6a8"
down_revision = "a1f2b3c4d5e6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. parties
    op.create_table(
        "parties",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(200), nullable=False, unique=True),
        sa.Column("name_ne", sa.String(200), nullable=True),
        sa.Column("abbreviation", sa.String(30), nullable=False, unique=True),
        sa.Column("symbol_description", sa.String(500), nullable=True),
        sa.Column("registration_number", sa.String(100), nullable=True),
        sa.Column("address", sa.String(500), nullable=True),
        sa.Column("established_date", sa.Date, nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )

    # 2. candidate_profiles
    op.create_table(
        "candidate_profiles",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("date_of_birth", sa.Date, nullable=True),
        sa.Column("gender", sa.String(20), nullable=True),
        sa.Column("address", sa.String(500), nullable=True),
        sa.Column("citizenship_no", sa.String(50), nullable=True),
        sa.Column("photo_path", sa.String(500), nullable=True),
        sa.Column("qualifications", sa.Text, nullable=True),
        sa.Column("party_id", sa.Integer, sa.ForeignKey("parties.id", name="fk_cp_party"), nullable=True, index=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )

    # 3. fptp_candidate_nominations
    op.create_table(
        "fptp_candidate_nominations",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("election_id", sa.Integer, sa.ForeignKey("elections.id", name="fk_fptp_nom_election"), nullable=False, index=True),
        sa.Column("contest_id", sa.Integer, sa.ForeignKey("election_contests.id", name="fk_fptp_nom_contest"), nullable=False, index=True),
        sa.Column("candidate_id", sa.Integer, sa.ForeignKey("candidate_profiles.id", name="fk_fptp_nom_candidate"), nullable=False, index=True),
        sa.Column("party_id", sa.Integer, sa.ForeignKey("parties.id", name="fk_fptp_nom_party"), nullable=True, index=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="PENDING"),
        sa.Column("nominated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("reviewed_at", sa.DateTime, nullable=True),
        sa.Column("reviewed_by", sa.Integer, sa.ForeignKey("users.id", name="fk_fptp_nom_reviewer"), nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("contest_id", "candidate_id", name="uq_fptp_nom_contest_candidate"),
    )

    # 4. pr_party_submissions
    op.create_table(
        "pr_party_submissions",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("election_id", sa.Integer, sa.ForeignKey("elections.id", name="fk_pr_sub_election"), nullable=False, index=True),
        sa.Column("party_id", sa.Integer, sa.ForeignKey("parties.id", name="fk_pr_sub_party"), nullable=False, index=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="DRAFT"),
        sa.Column("submitted_at", sa.DateTime, nullable=True),
        sa.Column("validated_at", sa.DateTime, nullable=True),
        sa.Column("reviewed_at", sa.DateTime, nullable=True),
        sa.Column("reviewed_by", sa.Integer, sa.ForeignKey("users.id", name="fk_pr_sub_reviewer"), nullable=True),
        sa.Column("validation_snapshot", sa.Text, nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("election_id", "party_id", name="uq_pr_sub_election_party"),
    )

    # 5. pr_party_list_entries
    op.create_table(
        "pr_party_list_entries",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("submission_id", sa.Integer, sa.ForeignKey("pr_party_submissions.id", name="fk_pr_entry_submission"), nullable=False, index=True),
        sa.Column("candidate_id", sa.Integer, sa.ForeignKey("candidate_profiles.id", name="fk_pr_entry_candidate"), nullable=False, index=True),
        sa.Column("list_position", sa.Integer, nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("submission_id", "candidate_id", name="uq_pr_entry_submission_candidate"),
        sa.UniqueConstraint("submission_id", "list_position", name="uq_pr_entry_submission_position"),
    )


def downgrade() -> None:
    op.drop_table("pr_party_list_entries")
    op.drop_table("pr_party_submissions")
    op.drop_table("fptp_candidate_nominations")
    op.drop_table("candidate_profiles")
    op.drop_table("parties")
