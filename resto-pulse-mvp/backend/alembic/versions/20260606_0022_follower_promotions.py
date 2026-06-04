"""Takipci kampanya ve kisisel kuponlar (Faz D3)

Revision ID: 20260606_0022
Revises: 20260605_0021
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260606_0022"
down_revision = "20260605_0021"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "follower_promotions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "ownership_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("restaurant_ownerships.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "restaurant_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("restaurants.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(length=120), nullable=False),
        sa.Column("discount_percent", sa.Integer(), nullable=False),
        sa.Column("valid_until", sa.DateTime(timezone=True), nullable=False),
        sa.Column("max_coupons", sa.Integer(), nullable=False, server_default="100"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_follower_promotions_restaurant_id", "follower_promotions", ["restaurant_id"])
    op.create_index("ix_follower_promotions_ownership_id", "follower_promotions", ["ownership_id"])
    op.create_index("ix_follower_promotions_status", "follower_promotions", ["status"])

    op.create_table(
        "follower_coupons",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "promotion_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("follower_promotions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "restaurant_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("restaurants.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("code", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="issued"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("redeemed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("redeemed_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("promotion_id", "user_id", name="uq_follower_coupon_promo_user"),
        sa.UniqueConstraint("code", name="uq_follower_coupon_code"),
    )
    op.create_index("ix_follower_coupons_user_id", "follower_coupons", ["user_id"])
    op.create_index("ix_follower_coupons_restaurant_id", "follower_coupons", ["restaurant_id"])
    op.create_index("ix_follower_coupons_code", "follower_coupons", ["code"])
    op.create_index("ix_follower_coupons_status", "follower_coupons", ["status"])


def downgrade() -> None:
    op.drop_table("follower_coupons")
    op.drop_table("follower_promotions")
