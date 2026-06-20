"""Refresh token iptal listesi (rotation icin)

Revision ID: 20260626_0049
Revises: 20260625_0048
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260626_0049"
down_revision = "20260625_0048"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "revoked_refresh_tokens",
        sa.Column("jti", sa.String(length=36), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("jti"),
    )
    op.create_index("ix_revoked_refresh_tokens_user_id", "revoked_refresh_tokens", ["user_id"])
    op.create_index("ix_revoked_refresh_tokens_expires_at", "revoked_refresh_tokens", ["expires_at"])


def downgrade() -> None:
    op.drop_index("ix_revoked_refresh_tokens_expires_at", table_name="revoked_refresh_tokens")
    op.drop_index("ix_revoked_refresh_tokens_user_id", table_name="revoked_refresh_tokens")
    op.drop_table("revoked_refresh_tokens")
