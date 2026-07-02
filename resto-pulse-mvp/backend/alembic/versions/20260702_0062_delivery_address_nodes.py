"""address_node_cache + order delivery coordinates"""

from alembic import op
import sqlalchemy as sa

revision = "20260702_0062"
down_revision = "20260702_0061"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "address_node_cache",
        sa.Column("tradres_id", sa.BigInteger(), nullable=False),
        sa.Column("parent_id", sa.BigInteger(), nullable=True),
        sa.Column("level", sa.String(length=40), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("latitude", sa.Numeric(precision=10, scale=7), nullable=True),
        sa.Column("longitude", sa.Numeric(precision=10, scale=7), nullable=True),
        sa.Column("synced_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("geocoded_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("tradres_id"),
    )
    op.create_index("ix_address_node_cache_parent_id", "address_node_cache", ["parent_id"])
    op.add_column("restaurant_orders", sa.Column("delivery_building_node_id", sa.BigInteger(), nullable=True))
    op.add_column(
        "restaurant_orders",
        sa.Column("delivery_latitude", sa.Numeric(precision=10, scale=7), nullable=True),
    )
    op.add_column(
        "restaurant_orders",
        sa.Column("delivery_longitude", sa.Numeric(precision=10, scale=7), nullable=True),
    )
    op.add_column(
        "restaurant_orders",
        sa.Column("delivery_address_note", sa.String(length=120), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("restaurant_orders", "delivery_address_note")
    op.drop_column("restaurant_orders", "delivery_longitude")
    op.drop_column("restaurant_orders", "delivery_latitude")
    op.drop_column("restaurant_orders", "delivery_building_node_id")
    op.drop_index("ix_address_node_cache_parent_id", table_name="address_node_cache")
    op.drop_table("address_node_cache")
