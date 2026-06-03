"""Uygulama KPI olaylari (oturum, giris, arama)."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260603_0018"
down_revision = "20260531_0017"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "app_usage_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("event_type", sa.String(length=40), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("session_id", sa.String(length=64), nullable=True),
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
        sa.Column("platform", sa.String(length=16), nullable=True),
        sa.Column("app_version", sa.String(length=32), nullable=True),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_app_usage_events_event_type", "app_usage_events", ["event_type"])
    op.create_index("ix_app_usage_events_user_id", "app_usage_events", ["user_id"])
    op.create_index("ix_app_usage_events_created_at", "app_usage_events", ["created_at"])
    op.create_index("ix_app_usage_events_session_id", "app_usage_events", ["session_id"])


def downgrade() -> None:
    op.drop_table("app_usage_events")
