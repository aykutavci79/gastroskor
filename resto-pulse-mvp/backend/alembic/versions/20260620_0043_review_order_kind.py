"""Review kind + siparis baglantisi

Revision ID: 20260620_0043
Revises: 20260613_0043
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "20260620_0043"
down_revision = "20260613_0043"
branch_labels = None
depends_on = None

review_kind = sa.Enum("visit", "online_order", name="review_kind")


def upgrade() -> None:
    bind = op.get_bind()
    review_kind.create(bind, checkfirst=True)

    insp = inspect(bind)
    review_cols = {col["name"] for col in insp.get_columns("reviews")}
    review_indexes = {idx["name"] for idx in insp.get_indexes("reviews")}
    review_fks = {fk["name"] for fk in insp.get_foreign_keys("reviews")}
    review_uqs = {uc["name"] for uc in insp.get_unique_constraints("reviews")}

    if "review_kind" not in review_cols:
        op.add_column(
            "reviews",
            sa.Column("review_kind", review_kind, nullable=False, server_default="visit"),
        )
    if "restaurant_order_id" not in review_cols:
        op.add_column(
            "reviews",
            sa.Column("restaurant_order_id", sa.UUID(), nullable=True),
        )

    if "fk_reviews_restaurant_order_id" not in review_fks:
        op.create_foreign_key(
            "fk_reviews_restaurant_order_id",
            "reviews",
            "restaurant_orders",
            ["restaurant_order_id"],
            ["id"],
            ondelete="SET NULL",
        )
    if "ix_reviews_restaurant_order_id" not in review_indexes:
        op.create_index("ix_reviews_restaurant_order_id", "reviews", ["restaurant_order_id"])
    if "ix_reviews_review_kind" not in review_indexes:
        op.create_index("ix_reviews_review_kind", "reviews", ["review_kind"])
    if "uq_reviews_restaurant_order_id" not in review_uqs:
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
