"""Add indirect election tables for post-finalization workflows.

Three new tables for indirect local executive and DCC elections:
  - indirect_elections: tracks the indirect election event
  - assembly_members: members eligible to vote/be elected
  - indirect_seats: seat definitions with quota enforcement

Revision ID: n5c6d7e8f9a0
Revises: m4b5c6d7e8f9
Create Date: 2026-04-11
"""
from alembic import op
import sqlalchemy as sa

revision = "n5c6d7e8f9a0"
down_revision = "m4b5c6d7e8f9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── indirect_elections ──────────────────────────────────────
    op.create_table(
        "indirect_elections",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column(
            "source_election_id",
            sa.Integer,
            sa.ForeignKey("elections.id", name="fk_indirect_source_election"),
            nullable=False,
            index=True,
        ),
        sa.Column("indirect_type", sa.String(40), nullable=False, index=True),
        sa.Column(
            "area_id",
            sa.Integer,
            sa.ForeignKey("area_units.id", name="fk_indirect_area"),
            nullable=False,
            index=True,
        ),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column(
            "status",
            sa.String(30),
            nullable=False,
            server_default="DRAFT",
        ),
        sa.Column("total_seats", sa.Integer, nullable=False, default=0),
        sa.Column("women_quota", sa.Integer, nullable=False, default=0),
        sa.Column("dalit_minority_quota", sa.Integer, nullable=False, default=0),
        sa.Column(
            "created_by",
            sa.Integer,
            sa.ForeignKey("users.id", name="fk_indirect_created_by"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime,
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("completed_at", sa.DateTime, nullable=True),
        sa.UniqueConstraint(
            "source_election_id",
            "indirect_type",
            "area_id",
            name="uq_indirect_election_source_type_area",
        ),
    )

    # ── assembly_members ───────────────────────────────────────
    op.create_table(
        "assembly_members",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column(
            "indirect_election_id",
            sa.Integer,
            sa.ForeignKey(
                "indirect_elections.id",
                name="fk_asm_indirect_election",
                ondelete="CASCADE",
            ),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "source_result_id",
            sa.Integer,
            sa.ForeignKey(
                "fptp_result_rows.id",
                name="fk_asm_source_result",
            ),
            nullable=True,
        ),
        sa.Column("member_name", sa.String(255), nullable=False),
        sa.Column("position_title", sa.String(255), nullable=False),
        sa.Column("area_name", sa.String(255), nullable=False),
        sa.Column("gender", sa.String(20), nullable=True),
        sa.Column(
            "is_dalit_minority",
            sa.Boolean,
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "is_eligible_voter",
            sa.Boolean,
            nullable=False,
            server_default="1",
        ),
        sa.Column(
            "is_eligible_candidate",
            sa.Boolean,
            nullable=False,
            server_default="1",
        ),
        sa.Column(
            "created_at",
            sa.DateTime,
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    # ── indirect_seats ─────────────────────────────────────────
    op.create_table(
        "indirect_seats",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column(
            "indirect_election_id",
            sa.Integer,
            sa.ForeignKey(
                "indirect_elections.id",
                name="fk_iseat_indirect_election",
                ondelete="CASCADE",
            ),
            nullable=False,
            index=True,
        ),
        sa.Column("seat_label", sa.String(120), nullable=False),
        sa.Column("seat_number", sa.Integer, nullable=False),
        sa.Column("quota_category", sa.String(30), nullable=False),
        sa.Column(
            "elected_member_id",
            sa.Integer,
            sa.ForeignKey(
                "assembly_members.id",
                name="fk_iseat_elected_member",
            ),
            nullable=True,
        ),
        sa.Column("elected_at", sa.DateTime, nullable=True),
        sa.Column(
            "recorded_by",
            sa.Integer,
            sa.ForeignKey("users.id", name="fk_iseat_recorded_by"),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_table("indirect_seats")
    op.drop_table("assembly_members")
    op.drop_table("indirect_elections")
