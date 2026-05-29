"""restaurant owner panel tables

Revision ID: 20260528_0006
Revises: 20260527_0005
Create Date: 2026-05-28 12:00:00
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20260528_0006"
down_revision = "20260527_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "restaurant_ownerships",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("restaurant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("google_place_id", sa.String(length=255), nullable=False),
        sa.Column("verification_method", sa.String(length=30), nullable=True),
        sa.Column("verification_status", sa.String(length=30), nullable=False, server_default="pending_sms"),
        sa.Column("panel_tier", sa.String(length=20), nullable=False, server_default="limited"),
        sa.Column("phone_e164", sa.String(length=32), nullable=True),
        sa.Column("phone_last_four", sa.String(length=4), nullable=True),
        sa.Column("tax_document_note", sa.Text(), nullable=True),
        sa.Column("admin_notes", sa.Text(), nullable=True),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("visit_completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["restaurant_id"], ["restaurants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("google_place_id", name="uq_google_place_ownership"),
        sa.UniqueConstraint("user_id", "restaurant_id", name="uq_user_restaurant_ownership"),
    )
    op.create_index(op.f("ix_restaurant_ownerships_user_id"), "restaurant_ownerships", ["user_id"], unique=False)
    op.create_index(
        op.f("ix_restaurant_ownerships_restaurant_id"), "restaurant_ownerships", ["restaurant_id"], unique=False
    )
    op.create_index(
        op.f("ix_restaurant_ownerships_google_place_id"), "restaurant_ownerships", ["google_place_id"], unique=False
    )
    op.create_index(
        op.f("ix_restaurant_ownerships_verification_status"),
        "restaurant_ownerships",
        ["verification_status"],
        unique=False,
    )

    op.create_table(
        "restaurant_subscriptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("ownership_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="trial"),
        sa.Column("trial_started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("trial_ends_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("intro_price_used", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("paid_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("activated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["ownership_id"], ["restaurant_ownerships.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("ownership_id"),
    )
    op.create_index(op.f("ix_restaurant_subscriptions_status"), "restaurant_subscriptions", ["status"], unique=False)

    op.create_table(
        "restaurant_otp_challenges",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("ownership_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("phone_e164", sa.String(length=32), nullable=False),
        sa.Column("code_hash", sa.String(length=128), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("consumed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["ownership_id"], ["restaurant_ownerships.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_restaurant_otp_challenges_ownership_id"),
        "restaurant_otp_challenges",
        ["ownership_id"],
        unique=False,
    )

    op.create_table(
        "restaurant_competitors",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("ownership_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("google_place_id", sa.String(length=255), nullable=False),
        sa.Column("competitor_name", sa.String(length=255), nullable=False),
        sa.Column("competitor_restaurant_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("last_rating", sa.Float(), nullable=True),
        sa.Column("last_review_count", sa.Integer(), nullable=True),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["competitor_restaurant_id"], ["restaurants.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["ownership_id"], ["restaurant_ownerships.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("ownership_id", "google_place_id", name="uq_ownership_competitor_place"),
    )
    op.create_index(
        op.f("ix_restaurant_competitors_ownership_id"), "restaurant_competitors", ["ownership_id"], unique=False
    )

    op.create_table(
        "restaurant_analytics_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("restaurant_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("place_id", sa.String(length=255), nullable=True),
        sa.Column("event_type", sa.String(length=40), nullable=False),
        sa.Column("metadata_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["restaurant_id"], ["restaurants.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_restaurant_analytics_events_restaurant_id"),
        "restaurant_analytics_events",
        ["restaurant_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_restaurant_analytics_events_event_type"), "restaurant_analytics_events", ["event_type"], unique=False
    )
    op.create_index(
        op.f("ix_restaurant_analytics_events_created_at"), "restaurant_analytics_events", ["created_at"], unique=False
    )


def downgrade() -> None:
    op.drop_table("restaurant_analytics_events")
    op.drop_table("restaurant_competitors")
    op.drop_table("restaurant_otp_challenges")
    op.drop_table("restaurant_subscriptions")
    op.drop_table("restaurant_ownerships")
