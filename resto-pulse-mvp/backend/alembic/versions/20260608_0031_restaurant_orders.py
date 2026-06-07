"""Restoran online siparis (telefon, restoran onayi)

Revision ID: 20260608_0031
Revises: 20260607_0030
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260608_0031"
down_revision = "20260607_0030"
branch_labels = None
depends_on = None

order_status = postgresql.ENUM(
    "pending",
    "accepted",
    "rejected",
    name="restaurantorderstatus",
    create_type=True,
)


def upgrade() -> None:
    order_status.create(op.get_bind(), checkfirst=True)

    op.add_column(
        "restaurant_ownerships",
        sa.Column("online_orders_enabled", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column(
        "restaurant_menu_items",
        sa.Column("image_url", sa.String(length=1024), nullable=True),
    )

    op.create_table(
        "restaurant_orders",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("restaurant_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("customer_phone", sa.String(length=32), nullable=False),
        sa.Column("customer_name", sa.String(length=120), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("status", order_status, nullable=False, server_default="pending"),
        sa.Column("total_tl", sa.Numeric(10, 2), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["restaurant_id"], ["restaurants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_restaurant_orders_restaurant_id", "restaurant_orders", ["restaurant_id"])
    op.create_index("ix_restaurant_orders_user_id", "restaurant_orders", ["user_id"])
    op.create_index("ix_restaurant_orders_status", "restaurant_orders", ["status"])
    op.create_index(
        "ix_restaurant_orders_user_restaurant_pending",
        "restaurant_orders",
        ["user_id", "restaurant_id"],
        unique=True,
        postgresql_where=sa.text("status = 'pending'"),
    )

    op.create_table(
        "restaurant_order_lines",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("order_id", sa.UUID(), nullable=False),
        sa.Column("menu_item_id", sa.UUID(), nullable=True),
        sa.Column("name_snapshot", sa.String(length=120), nullable=False),
        sa.Column("price_snapshot", sa.Numeric(10, 2), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["menu_item_id"], ["restaurant_menu_items.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["order_id"], ["restaurant_orders.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_restaurant_order_lines_order_id", "restaurant_order_lines", ["order_id"])


def downgrade() -> None:
    op.drop_index("ix_restaurant_order_lines_order_id", table_name="restaurant_order_lines")
    op.drop_table("restaurant_order_lines")
    op.drop_index("ix_restaurant_orders_user_restaurant_pending", table_name="restaurant_orders")
    op.drop_index("ix_restaurant_orders_status", table_name="restaurant_orders")
    op.drop_index("ix_restaurant_orders_user_id", table_name="restaurant_orders")
    op.drop_index("ix_restaurant_orders_restaurant_id", table_name="restaurant_orders")
    op.drop_table("restaurant_orders")
    op.drop_column("restaurant_menu_items", "image_url")
    op.drop_column("restaurant_ownerships", "online_orders_enabled")
    order_status.drop(op.get_bind(), checkfirst=True)
