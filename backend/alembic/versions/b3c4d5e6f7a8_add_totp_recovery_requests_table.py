"""add totp_recovery_requests table

Revision ID: b3c4d5e6f7a8
Revises: a1b2c3d4e5f7
Create Date: 2026-03-11
"""

from alembic import op
import sqlalchemy as sa


revision = "b3c4d5e6f7a8"
down_revision = "a1b2c3d4e5f7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "totp_recovery_requests",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("role", sa.String(50), nullable=False),
        sa.Column("code_hash", sa.String(64), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("used_at", sa.DateTime(), nullable=True),
        sa.Column("status", sa.String(32), nullable=False, server_default="PENDING_CODE"),
        sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("requested_ip", sa.String(64), nullable=True),
        sa.Column("requested_user_agent", sa.String(500), nullable=True),
        sa.Column("resolved_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
        sa.Column("resolution_note", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_totp_recovery_requests_user_id", "totp_recovery_requests", ["user_id"])
    op.create_index("ix_totp_recovery_requests_code_hash", "totp_recovery_requests", ["code_hash"])
    op.create_index("ix_totp_recovery_requests_expires_at", "totp_recovery_requests", ["expires_at"])


def downgrade() -> None:
    op.drop_index("ix_totp_recovery_requests_expires_at", table_name="totp_recovery_requests")
    op.drop_index("ix_totp_recovery_requests_code_hash", table_name="totp_recovery_requests")
    op.drop_index("ix_totp_recovery_requests_user_id", table_name="totp_recovery_requests")
    op.drop_table("totp_recovery_requests")
