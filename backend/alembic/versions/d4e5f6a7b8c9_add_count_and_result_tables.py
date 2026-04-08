"""
add count_runs and result tables
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, None] = "c3d4e5f6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── count_runs ──────────────────────────────────────────────
    op.create_table(
        "count_runs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("election_id", sa.Integer(), sa.ForeignKey("elections.id", name="fk_cr_election"), nullable=False, index=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="PENDING"),
        sa.Column("started_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id", name="fk_cr_created_by"), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("total_ballots_counted", sa.Integer(), nullable=True),
        sa.Column("total_fptp_adjudication", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_pr_adjudication", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_final", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("is_locked", sa.Boolean(), nullable=False, server_default="0"),
    )

    # ── fptp_result_rows ────────────────────────────────────────
    op.create_table(
        "fptp_result_rows",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("count_run_id", sa.Integer(), sa.ForeignKey("count_runs.id", name="fk_fptp_rr_count_run"), nullable=False, index=True),
        sa.Column("contest_id", sa.Integer(), sa.ForeignKey("election_contests.id", name="fk_fptp_rr_contest"), nullable=False, index=True),
        sa.Column("nomination_id", sa.Integer(), sa.ForeignKey("fptp_candidate_nominations.id", name="fk_fptp_rr_nomination"), nullable=False),
        sa.Column("candidate_name", sa.String(255), nullable=False),
        sa.Column("party_name", sa.String(255), nullable=True),
        sa.Column("vote_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("rank", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_winner", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("requires_adjudication", sa.Boolean(), nullable=False, server_default="0"),
    )

    # ── pr_result_rows ──────────────────────────────────────────
    op.create_table(
        "pr_result_rows",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("count_run_id", sa.Integer(), sa.ForeignKey("count_runs.id", name="fk_pr_rr_count_run"), nullable=False, index=True),
        sa.Column("party_id", sa.Integer(), sa.ForeignKey("parties.id", name="fk_pr_rr_party"), nullable=False),
        sa.Column("party_name", sa.String(255), nullable=False),
        sa.Column("valid_votes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("vote_share_pct", sa.Numeric(10, 6), nullable=False, server_default="0"),
        sa.Column("meets_threshold", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("allocated_seats", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("highest_quotient_numerator", sa.Integer(), nullable=True),
        sa.Column("highest_quotient_divisor", sa.Integer(), nullable=True),
        sa.Column("requires_adjudication", sa.Boolean(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_table("pr_result_rows")
    op.drop_table("fptp_result_rows")
    op.drop_table("count_runs")
