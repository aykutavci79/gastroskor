"""restaurant promo badges on ownership

Revision ID: 20260528_0009
Revises: 20260528_0008
Create Date: 2026-05-29 06:00:00
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260528_0009"
down_revision = "20260528_0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "restaurant_ownerships",
        sa.Column("promo_has_own_courier", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column(
        "restaurant_ownerships",
        sa.Column("promo_direct_order_text", sa.String(length=120), nullable=True),
    )
    op.add_column(
        "restaurant_ownerships",
        sa.Column("promo_direct_order_phone", sa.String(length=32), nullable=True),
    )
    op.add_column(
        "restaurant_ownerships",
        sa.Column("promo_direct_order_whatsapp", sa.String(length=32), nullable=True),
    )
    op.add_column(
        "restaurant_ownerships",
        sa.Column("promo_direct_order_url", sa.String(length=500), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("restaurant_ownerships", "promo_direct_order_url")
    op.drop_column("restaurant_ownerships", "promo_direct_order_whatsapp")
    op.drop_column("restaurant_ownerships", "promo_direct_order_phone")
    op.drop_column("restaurant_ownerships", "promo_direct_order_text")
    op.drop_column("restaurant_ownerships", "promo_has_own_courier")
