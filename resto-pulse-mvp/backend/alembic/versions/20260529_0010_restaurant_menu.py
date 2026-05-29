"""restaurant menu items

Revision ID: 20260529_0010
Revises: 20260528_0009
Create Date: 2026-05-29 08:00:00
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260529_0010"
down_revision = "20260528_0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "restaurant_menu_items",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("ownership_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("price_tl", sa.Numeric(10, 2), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("category", sa.String(length=60), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["ownership_id"], ["restaurant_ownerships.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_restaurant_menu_items_ownership_id", "restaurant_menu_items", ["ownership_id"])


def downgrade() -> None:
    op.drop_index("ix_restaurant_menu_items_ownership_id", table_name="restaurant_menu_items")
    op.drop_table("restaurant_menu_items")
