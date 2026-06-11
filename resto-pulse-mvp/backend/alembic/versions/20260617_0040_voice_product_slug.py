"""Menu ogelerine sesli urun slug

Revision ID: 20260617_0040
Revises: 20260616_0039
"""

from alembic import op
import sqlalchemy as sa

revision = "20260617_0040"
down_revision = "20260616_0039"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "restaurant_menu_items",
        sa.Column("voice_product_slug", sa.String(60), nullable=True),
    )
    op.create_index(
        "ix_restaurant_menu_items_voice_product_slug",
        "restaurant_menu_items",
        ["voice_product_slug"],
    )
    op.create_index(
        "uq_restaurant_menu_items_ownership_voice_slug",
        "restaurant_menu_items",
        ["ownership_id", "voice_product_slug"],
        unique=True,
        postgresql_where=sa.text("voice_product_slug IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_restaurant_menu_items_ownership_voice_slug", table_name="restaurant_menu_items")
    op.drop_index("ix_restaurant_menu_items_voice_product_slug", table_name="restaurant_menu_items")
    op.drop_column("restaurant_menu_items", "voice_product_slug")
