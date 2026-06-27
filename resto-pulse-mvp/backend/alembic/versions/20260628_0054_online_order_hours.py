"""online_order_hours JSON on restaurant_ownerships."""

from __future__ import annotations

import json

import sqlalchemy as sa
from alembic import op

revision = "20260628_0054"
down_revision = "20260628_0053"
branch_labels = None
depends_on = None

_DEFAULT_HOURS = {
    "timezone": "Europe/Istanbul",
    "weekly": {
        day: {"closed": False, "open": "11:00", "close": "23:00"}
        for day in ("mon", "tue", "wed", "thu", "fri", "sat", "sun")
    },
}


def upgrade() -> None:
    op.add_column("restaurant_ownerships", sa.Column("online_order_hours", sa.JSON(), nullable=True))
    default_json = json.dumps(_DEFAULT_HOURS)
    op.execute(
        sa.text(
            """
            UPDATE restaurant_ownerships
            SET online_order_hours = CAST(:hours AS jsonb)
            WHERE online_orders_enabled IS TRUE AND online_order_hours IS NULL
            """
        ).bindparams(hours=default_json)
    )


def downgrade() -> None:
    op.drop_column("restaurant_ownerships", "online_order_hours")
