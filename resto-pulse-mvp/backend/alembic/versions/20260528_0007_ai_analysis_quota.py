"""ai analysis quota fields

Revision ID: 20260528_0007
Revises: 20260528_0006
Create Date: 2026-05-28 14:00:00
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260528_0007"
down_revision = "20260528_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "restaurant_ownerships",
        sa.Column("last_competitor_ai_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "restaurant_subscriptions",
        sa.Column("ai_analysis_interval_days", sa.Integer(), nullable=False, server_default="33"),
    )
    op.add_column(
        "restaurant_subscriptions",
        sa.Column(
            "ai_analysis_plan",
            sa.String(length=20),
            nullable=False,
            server_default="standart",
        ),
    )


def downgrade() -> None:
    op.drop_column("restaurant_subscriptions", "ai_analysis_plan")
    op.drop_column("restaurant_subscriptions", "ai_analysis_interval_days")
    op.drop_column("restaurant_ownerships", "last_competitor_ai_at")
