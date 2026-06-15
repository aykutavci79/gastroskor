"""Review kind + siparis baglantisi

Revision ID: 20260620_0043
Revises: 20260619_0042
"""

from alembic import op
import sqlalchemy as sa

revision = "20260620_0043"
down_revision = "20260619_0042"
branch_labels = None
depends_on = None

review_kind = sa.Enum("visit", "online_order", name="review_kind")


def upgrade() -> None:
    review_kind.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "reviews",
        sa.Column("review_kind", review_kind, nullable=False, server_default="visit"),
    )
    op.add_column(
        "reviews",
        sa.Column("restaurant_order_id", sa.UUID(), nullable=True),
    )
    op.create_foreign_key(
        "fk_reviews_restaurant_order_id",
        "reviews",
        "restaurant_orders",
        ["restaurant_order_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_reviews_restaurant_order_id", "reviews", ["restaurant_order_id"])
    op.create_index("ix_reviews_review_kind", "reviews", ["review_kind"])
    op.create_unique_constraint(
        "uq_reviews_restaurant_order_id",
        "reviews",
        ["restaurant_order_id"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_reviews_restaurant_order_id", "reviews", type_="unique")
    op.drop_index("ix_reviews_review_kind", table_name="reviews")
    op.drop_index("ix_reviews_restaurant_order_id", table_name="reviews")
    op.drop_constraint("fk_reviews_restaurant_order_id", "reviews", type_="foreignkey")
    op.drop_column("reviews", "restaurant_order_id")
    op.drop_column("reviews", "review_kind")
    review_kind.drop(op.get_bind(), checkfirst=True)
