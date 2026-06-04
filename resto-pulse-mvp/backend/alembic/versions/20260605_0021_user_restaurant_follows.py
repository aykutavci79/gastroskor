"""Kullanici restoran takibi (Faz D1)

Revision ID: 20260605_0021
Revises: 20260605_0020
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260605_0021"
down_revision = "20260605_0020"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_restaurant_follows",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column(
            "restaurant_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("restaurants.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("user_id", "restaurant_id", name="uq_user_restaurant_follow"),
    )
    op.create_index("ix_user_restaurant_follows_user_id", "user_restaurant_follows", ["user_id"])
    op.create_index("ix_user_restaurant_follows_restaurant_id", "user_restaurant_follows", ["restaurant_id"])
    op.create_index("ix_user_restaurant_follows_created_at", "user_restaurant_follows", ["created_at"])


def downgrade() -> None:
    op.drop_table("user_restaurant_follows")
