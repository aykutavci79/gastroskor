"""add GI fields on restaurants and is_demo on reviews

Revision ID: 20260526_0003
Revises: 20260526_0002
Create Date: 2026-05-26 20:00:00
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260526_0003"
down_revision = "20260526_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "restaurants",
        sa.Column("has_geographical_indication", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "restaurants",
        sa.Column("gi_product_name", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "reviews",
        sa.Column("is_demo", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.alter_column("restaurants", "has_geographical_indication", server_default=None)
    op.alter_column("reviews", "is_demo", server_default=None)


def downgrade() -> None:
    op.drop_column("reviews", "is_demo")
    op.drop_column("restaurants", "gi_product_name")
    op.drop_column("restaurants", "has_geographical_indication")
