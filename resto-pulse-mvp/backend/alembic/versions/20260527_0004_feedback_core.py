"""add feedback core tables (public/private/messages)

Revision ID: 20260527_0004
Revises: 20260526_0003
Create Date: 2026-05-27 17:30:00
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20260527_0004"
down_revision = "20260526_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    sentiment_enum = postgresql.ENUM(
        "positive",
        "neutral",
        "negative",
        name="sentimentlabel",
        create_type=False,
    )

    op.create_table(
        "public_reviews",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("place_id", sa.String(length=255), nullable=False),
        sa.Column("restaurant_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("author_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("review_text", sa.Text(), nullable=False),
        sa.Column("sentiment_label", sentiment_enum, nullable=True),
        sa.Column("is_visible", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["restaurant_id"], ["restaurants.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_public_reviews_place_id"), "public_reviews", ["place_id"], unique=False)
    op.create_index(op.f("ix_public_reviews_restaurant_id"), "public_reviews", ["restaurant_id"], unique=False)
    op.create_index(op.f("ix_public_reviews_author_id"), "public_reviews", ["author_id"], unique=False)
    op.create_index(op.f("ix_public_reviews_sentiment_label"), "public_reviews", ["sentiment_label"], unique=False)

    op.create_table(
        "private_feedbacks",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("place_id", sa.String(length=255), nullable=False),
        sa.Column("restaurant_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("author_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("category", sa.String(length=50), nullable=False),
        sa.Column("severity", sa.String(length=30), nullable=False, server_default="medium"),
        sa.Column("visit_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="open"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["restaurant_id"], ["restaurants.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_private_feedbacks_place_id"), "private_feedbacks", ["place_id"], unique=False)
    op.create_index(op.f("ix_private_feedbacks_restaurant_id"), "private_feedbacks", ["restaurant_id"], unique=False)
    op.create_index(op.f("ix_private_feedbacks_author_id"), "private_feedbacks", ["author_id"], unique=False)
    op.create_index(op.f("ix_private_feedbacks_category"), "private_feedbacks", ["category"], unique=False)
    op.create_index(op.f("ix_private_feedbacks_severity"), "private_feedbacks", ["severity"], unique=False)
    op.create_index(op.f("ix_private_feedbacks_status"), "private_feedbacks", ["status"], unique=False)

    op.create_table(
        "feedback_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("feedback_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("sender_type", sa.String(length=20), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("attachments_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["feedback_id"], ["private_feedbacks.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_feedback_messages_feedback_id"), "feedback_messages", ["feedback_id"], unique=False)
    op.create_index(op.f("ix_feedback_messages_sender_type"), "feedback_messages", ["sender_type"], unique=False)

    op.alter_column("public_reviews", "is_visible", server_default=None)
    op.alter_column("private_feedbacks", "severity", server_default=None)
    op.alter_column("private_feedbacks", "status", server_default=None)


def downgrade() -> None:
    op.drop_index(op.f("ix_feedback_messages_sender_type"), table_name="feedback_messages")
    op.drop_index(op.f("ix_feedback_messages_feedback_id"), table_name="feedback_messages")
    op.drop_table("feedback_messages")

    op.drop_index(op.f("ix_private_feedbacks_status"), table_name="private_feedbacks")
    op.drop_index(op.f("ix_private_feedbacks_severity"), table_name="private_feedbacks")
    op.drop_index(op.f("ix_private_feedbacks_category"), table_name="private_feedbacks")
    op.drop_index(op.f("ix_private_feedbacks_author_id"), table_name="private_feedbacks")
    op.drop_index(op.f("ix_private_feedbacks_restaurant_id"), table_name="private_feedbacks")
    op.drop_index(op.f("ix_private_feedbacks_place_id"), table_name="private_feedbacks")
    op.drop_table("private_feedbacks")

    op.drop_index(op.f("ix_public_reviews_sentiment_label"), table_name="public_reviews")
    op.drop_index(op.f("ix_public_reviews_author_id"), table_name="public_reviews")
    op.drop_index(op.f("ix_public_reviews_restaurant_id"), table_name="public_reviews")
    op.drop_index(op.f("ix_public_reviews_place_id"), table_name="public_reviews")
    op.drop_table("public_reviews")

