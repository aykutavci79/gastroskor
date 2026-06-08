"""Siparis gunluk numarasi ve teslimat adresi

Revision ID: 20260613_0032
Revises: 20260608_0031
"""

from alembic import op
import sqlalchemy as sa

revision = "20260613_0032"
down_revision = "20260608_0031"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "restaurant_orders",
        sa.Column("customer_address", sa.Text(), nullable=True),
    )
    op.add_column(
        "restaurant_orders",
        sa.Column("order_day", sa.Date(), nullable=True),
    )
    op.add_column(
        "restaurant_orders",
        sa.Column("daily_no", sa.Integer(), nullable=True),
    )
    op.create_index("ix_restaurant_orders_order_day", "restaurant_orders", ["order_day"])
    op.create_unique_constraint(
        "uq_restaurant_orders_daily_no",
        "restaurant_orders",
        ["restaurant_id", "order_day", "daily_no"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_restaurant_orders_daily_no", "restaurant_orders", type_="unique")
    op.drop_index("ix_restaurant_orders_order_day", table_name="restaurant_orders")
    op.drop_column("restaurant_orders", "daily_no")
    op.drop_column("restaurant_orders", "order_day")
    op.drop_column("restaurant_orders", "customer_address")
