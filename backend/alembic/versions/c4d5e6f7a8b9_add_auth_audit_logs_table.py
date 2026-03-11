"""add auth_audit_logs table

Revision ID: c4d5e6f7a8b9
Revises: b3c4d5e6f7a8
Create Date: 2026-03-11
"""

from alembic import op
import sqlalchemy as sa


revision = "c4d5e6f7a8b9"
down_revision = "b3c4d5e6f7a8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "auth_audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("actor_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("target_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("action", sa.String(80), nullable=False),
        sa.Column("outcome", sa.String(20), nullable=False, server_default="SUCCESS"),
        sa.Column("ip_address", sa.String(64), nullable=True),
        sa.Column("user_agent", sa.String(500), nullable=True),
        sa.Column("metadata_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_auth_audit_logs_actor_user_id", "auth_audit_logs", ["actor_user_id"])
    op.create_index("ix_auth_audit_logs_target_user_id", "auth_audit_logs", ["target_user_id"])
    op.create_index("ix_auth_audit_logs_action", "auth_audit_logs", ["action"])
    op.create_index("ix_auth_audit_logs_created_at", "auth_audit_logs", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_auth_audit_logs_created_at", table_name="auth_audit_logs")
    op.drop_index("ix_auth_audit_logs_action", table_name="auth_audit_logs")
    op.drop_index("ix_auth_audit_logs_target_user_id", table_name="auth_audit_logs")
    op.drop_index("ix_auth_audit_logs_actor_user_id", table_name="auth_audit_logs")
    op.drop_table("auth_audit_logs")
