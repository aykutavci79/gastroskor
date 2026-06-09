"""Review telafi teklifi (24s restoran / 72s musteri)

Revision ID: 20260614_0037
Revises: 20260613_0036
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260614_0037"
down_revision = "20260613_0036"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "reviews",
        sa.Column("publication_status", sa.String(length=32), nullable=False, server_default="published"),
    )
    op.add_column(
        "reviews",
        sa.Column("remedy_restaurant_deadline_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "reviews",
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_reviews_publication_status", "reviews", ["publication_status"])

    op.create_table(
        "review_remedy_offers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("review_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("reviews.id", ondelete="CASCADE"), nullable=False),
        sa.Column("restaurant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("discount_percent", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("coupon_expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("offer_message", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("offered_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("customer_deadline_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("responded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("review_id", name="uq_review_remedy_offer_review"),
        sa.UniqueConstraint("code", name="uq_review_remedy_offer_code"),
    )
    op.create_index("ix_review_remedy_offers_status", "review_remedy_offers", ["status"])
    op.create_index("ix_review_remedy_offers_user_id", "review_remedy_offers", ["user_id"])


def downgrade() -> None:
    op.drop_table("review_remedy_offers")
    op.drop_index("ix_reviews_publication_status", table_name="reviews")
    op.drop_column("reviews", "published_at")
    op.drop_column("reviews", "remedy_restaurant_deadline_at")
    op.drop_column("reviews", "publication_status")
