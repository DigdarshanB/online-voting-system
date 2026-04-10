"""add provincial schema: scope_area_id, voter_area_assignments, pr_elected_members

Revision ID: j1e2f3a4b5c6
Revises: i0d1e2f3a4b5
Create Date: 2026-04-10

Additive-only migration for Provincial Assembly election support:

1. elections.scope_area_id — FK to area_units.id.
   Formal referential-integrity link for the province an election is scoped to.
   NULL for FEDERAL and LOCAL elections.

2. voter_area_assignments — new table for generic per-level voter area assignments.
   Does NOT replace or modify voter_constituency_assignments (federal).

3. pr_elected_members — persists PR seat winners after Sainte-Laguë allocation.
   One row per elected candidate per contest per count run.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "j1e2f3a4b5c6"
down_revision: Union[str, Sequence[str], None] = "i0d1e2f3a4b5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. elections.scope_area_id ──────────────────────────────
    op.add_column(
        "elections",
        sa.Column("scope_area_id", sa.Integer(), nullable=True),
    )
    op.create_index("ix_elections_scope_area_id", "elections", ["scope_area_id"])
    op.create_foreign_key(
        "fk_elections_scope_area",
        "elections",
        "area_units",
        ["scope_area_id"],
        ["id"],
    )

    # ── 2. voter_area_assignments ───────────────────────────────
    op.create_table(
        "voter_area_assignments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("voter_id", sa.Integer(), nullable=False),
        sa.Column("area_id", sa.Integer(), nullable=False),
        sa.Column("government_level", sa.String(length=20), nullable=False),
        sa.Column(
            "assigned_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("assigned_by", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(
            ["voter_id"], ["users.id"], name="fk_vaa_voter"
        ),
        sa.ForeignKeyConstraint(
            ["area_id"], ["area_units.id"], name="fk_vaa_area"
        ),
        sa.ForeignKeyConstraint(
            ["assigned_by"], ["users.id"], name="fk_vaa_assigned_by"
        ),
        sa.UniqueConstraint(
            "voter_id", "government_level", name="uq_voter_area_one_per_level"
        ),
    )
    op.create_index("ix_vaa_voter_id", "voter_area_assignments", ["voter_id"])
    op.create_index("ix_vaa_area_id", "voter_area_assignments", ["area_id"])
    op.create_index(
        "ix_vaa_government_level",
        "voter_area_assignments",
        ["government_level"],
    )

    # ── 3. pr_elected_members ───────────────────────────────────
    op.create_table(
        "pr_elected_members",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("count_run_id", sa.Integer(), nullable=False),
        sa.Column("contest_id", sa.Integer(), nullable=False),
        sa.Column("party_id", sa.Integer(), nullable=False),
        sa.Column("candidate_id", sa.Integer(), nullable=False),
        sa.Column("list_entry_id", sa.Integer(), nullable=True),
        sa.Column("seat_number", sa.Integer(), nullable=False),
        sa.Column("candidate_name", sa.String(length=255), nullable=False),
        sa.Column("party_name", sa.String(length=255), nullable=False),
        sa.Column(
            "elected_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(
            ["count_run_id"], ["count_runs.id"], name="fk_prem_count_run"
        ),
        sa.ForeignKeyConstraint(
            ["contest_id"], ["election_contests.id"], name="fk_prem_contest"
        ),
        sa.ForeignKeyConstraint(
            ["party_id"], ["parties.id"], name="fk_prem_party"
        ),
        sa.ForeignKeyConstraint(
            ["candidate_id"],
            ["candidate_profiles.id"],
            name="fk_prem_candidate",
        ),
        sa.ForeignKeyConstraint(
            ["list_entry_id"],
            ["pr_party_list_entries.id"],
            name="fk_prem_list_entry",
        ),
    )
    op.create_index(
        "ix_prem_count_run_id", "pr_elected_members", ["count_run_id"]
    )
    op.create_index(
        "ix_prem_contest_id", "pr_elected_members", ["contest_id"]
    )
    op.create_index("ix_prem_party_id", "pr_elected_members", ["party_id"])
    op.create_index(
        "ix_prem_candidate_id", "pr_elected_members", ["candidate_id"]
    )


def downgrade() -> None:
    # Reverse order
    op.drop_table("pr_elected_members")
    op.drop_table("voter_area_assignments")
    op.drop_constraint("fk_elections_scope_area", "elections", type_="foreignkey")
    op.drop_index("ix_elections_scope_area_id", table_name="elections")
    op.drop_column("elections", "scope_area_id")
