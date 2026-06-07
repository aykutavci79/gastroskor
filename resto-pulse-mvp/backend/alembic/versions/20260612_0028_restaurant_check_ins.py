"""Restoran check-in kayitlari

Revision ID: 20260612_0028
Revises: 20260611_0027
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260612_0028"
down_revision = "20260611_0027"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "restaurant_check_ins",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("restaurant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("check_in_date", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("user_id", "restaurant_id", "check_in_date", name="uq_check_in_per_day"),
    )
    op.create_index("ix_restaurant_check_ins_user_id", "restaurant_check_ins", ["user_id"])
    op.create_index("ix_restaurant_check_ins_restaurant_id", "restaurant_check_ins", ["restaurant_id"])
    op.create_index("ix_restaurant_check_ins_check_in_date", "restaurant_check_ins", ["check_in_date"])
    op.create_index("ix_restaurant_check_ins_created_at", "restaurant_check_ins", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_restaurant_check_ins_created_at", table_name="restaurant_check_ins")
    op.drop_index("ix_restaurant_check_ins_check_in_date", table_name="restaurant_check_ins")
    op.drop_index("ix_restaurant_check_ins_restaurant_id", table_name="restaurant_check_ins")
    op.drop_index("ix_restaurant_check_ins_user_id", table_name="restaurant_check_ins")
    op.drop_table("restaurant_check_ins")
