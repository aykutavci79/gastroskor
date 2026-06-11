"""Online siparis kategori etiketleri

Revision ID: 20260610_0040
Revises: 20260616_0039
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260610_0040"
down_revision = "20260616_0039"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "restaurant_ownerships",
        sa.Column(
            "online_order_category_tags",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
    )


def downgrade() -> None:
    op.drop_column("restaurant_ownerships", "online_order_category_tags")
