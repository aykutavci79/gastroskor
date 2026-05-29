"""owner-selected card emoji

Revision ID: 20260529_0012
Revises: 20260529_0011
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260529_0012"
down_revision = "20260529_0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "restaurant_ownerships",
        sa.Column("card_emoji", sa.String(length=16), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("restaurant_ownerships", "card_emoji")
