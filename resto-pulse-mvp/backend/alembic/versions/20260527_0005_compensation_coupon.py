"""add compensation coupons table

Revision ID: 20260527_0005
Revises: 20260527_0004
Create Date: 2026-05-27 18:10:00
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20260527_0005"
down_revision = "20260527_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "compensation_coupons",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("feedback_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("restaurant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("discount_percent", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="issued"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("redeemed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["feedback_id"], ["private_feedbacks.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["restaurant_id"], ["restaurants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_index(op.f("ix_compensation_coupons_feedback_id"), "compensation_coupons", ["feedback_id"], unique=False)
    op.create_index(op.f("ix_compensation_coupons_restaurant_id"), "compensation_coupons", ["restaurant_id"], unique=False)
    op.create_index(op.f("ix_compensation_coupons_user_id"), "compensation_coupons", ["user_id"], unique=False)
    op.create_index(op.f("ix_compensation_coupons_status"), "compensation_coupons", ["status"], unique=False)
    op.create_index(op.f("ix_compensation_coupons_code"), "compensation_coupons", ["code"], unique=True)
    op.alter_column("compensation_coupons", "status", server_default=None)


def downgrade() -> None:
    op.drop_index(op.f("ix_compensation_coupons_code"), table_name="compensation_coupons")
    op.drop_index(op.f("ix_compensation_coupons_status"), table_name="compensation_coupons")
    op.drop_index(op.f("ix_compensation_coupons_user_id"), table_name="compensation_coupons")
    op.drop_index(op.f("ix_compensation_coupons_restaurant_id"), table_name="compensation_coupons")
    op.drop_index(op.f("ix_compensation_coupons_feedback_id"), table_name="compensation_coupons")
    op.drop_table("compensation_coupons")

