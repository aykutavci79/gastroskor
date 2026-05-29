"""promo menu image and instagram

Revision ID: 20260529_0011
Revises: 20260529_0010
Create Date: 2026-05-29 10:00:00
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260529_0011"
down_revision = "20260529_0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "restaurant_ownerships",
        sa.Column("promo_menu_image_url", sa.String(length=1024), nullable=True),
    )
    op.add_column(
        "restaurant_ownerships",
        sa.Column("promo_instagram", sa.String(length=120), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("restaurant_ownerships", "promo_instagram")
    op.drop_column("restaurant_ownerships", "promo_menu_image_url")
