"""panel notifications and preferences

Revision ID: 20260529_0014
Revises: 20260529_0013
Create Date: 2026-05-29

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260529_0014"
down_revision = "20260529_0013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "panel_notification_preferences",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("ownership_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("in_app_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("analysis_reminders", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("trial_reminders", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("negative_review_alerts", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("competitor_alerts", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["ownership_id"], ["restaurant_ownerships.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("ownership_id", name="uq_panel_notification_prefs_ownership"),
    )
    op.create_index(
        op.f("ix_panel_notification_preferences_ownership_id"),
        "panel_notification_preferences",
        ["ownership_id"],
        unique=False,
    )

    op.create_table(
        "panel_notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("ownership_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("notification_type", sa.String(length=40), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("cta_label", sa.String(length=80), nullable=True),
        sa.Column("cta_url", sa.String(length=500), nullable=True),
        sa.Column("dedupe_key", sa.String(length=255), nullable=False),
        sa.Column("email_status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("email_sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("email_error", sa.Text(), nullable=True),
        sa.Column("opened_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("clicked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("metadata_json", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["ownership_id"], ["restaurant_ownerships.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("ownership_id", "dedupe_key", name="uq_panel_notification_dedupe"),
    )
    op.create_index(op.f("ix_panel_notifications_ownership_id"), "panel_notifications", ["ownership_id"])
    op.create_index(op.f("ix_panel_notifications_user_id"), "panel_notifications", ["user_id"])
    op.create_index(op.f("ix_panel_notifications_notification_type"), "panel_notifications", ["notification_type"])
    op.create_index(op.f("ix_panel_notifications_created_at"), "panel_notifications", ["created_at"])


def downgrade() -> None:
    op.drop_table("panel_notifications")
    op.drop_table("panel_notification_preferences")
