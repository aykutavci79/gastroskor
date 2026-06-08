"""Siparis red sebebi alanlari

Revision ID: 20260613_0033
Revises: 20260613_0032
"""

from alembic import op
import sqlalchemy as sa

revision = "20260613_0033"
down_revision = "20260613_0032"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "restaurant_orders",
        sa.Column("reject_reason_code", sa.String(length=40), nullable=True),
    )
    op.add_column(
        "restaurant_orders",
        sa.Column("reject_reason_text", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("restaurant_orders", "reject_reason_text")
    op.drop_column("restaurant_orders", "reject_reason_code")
