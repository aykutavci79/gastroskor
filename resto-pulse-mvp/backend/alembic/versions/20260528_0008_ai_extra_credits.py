"""ai extra credits for paid early analysis

Revision ID: 20260528_0008
Revises: 20260528_0007
Create Date: 2026-05-28 16:00:00
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260528_0008"
down_revision = "20260528_0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "restaurant_subscriptions",
        sa.Column("ai_extra_credits", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("restaurant_subscriptions", "ai_extra_credits")
