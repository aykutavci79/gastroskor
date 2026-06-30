"""restaurant_table_reservations.occasion_type"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260701_0059"
down_revision = "20260701_0058"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "restaurant_table_reservations",
        sa.Column("occasion_type", sa.String(length=32), nullable=True),
    )
    op.create_index(
        "ix_restaurant_table_reservations_occasion_type",
        "restaurant_table_reservations",
        ["occasion_type"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_restaurant_table_reservations_occasion_type", table_name="restaurant_table_reservations")
    op.drop_column("restaurant_table_reservations", "occasion_type")
