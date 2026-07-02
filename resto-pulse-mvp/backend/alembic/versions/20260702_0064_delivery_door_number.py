"""Alembic upgrade sonrasi: delivery_door_number kolonu."""

from alembic import op
import sqlalchemy as sa

revision = "20260702_0064"
down_revision = "20260702_0063"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("restaurant_orders", sa.Column("delivery_door_number", sa.String(length=32), nullable=True))


def downgrade() -> None:
    op.drop_column("restaurant_orders", "delivery_door_number")
