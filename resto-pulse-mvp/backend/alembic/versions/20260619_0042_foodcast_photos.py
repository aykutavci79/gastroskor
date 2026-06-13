"""FoodCast tabak fotolari (yorumdan ayri)

Revision ID: 20260619_0042
Revises: 20260618_0041
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260619_0042"
down_revision = "20260618_0041"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "foodcast_photos",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("author_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("restaurant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("dish_name", sa.String(80), nullable=False),
        sa.Column("caption", sa.String(200), nullable=True),
        sa.Column("image_url", sa.String(512), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("city", sa.String(120), nullable=True),
        sa.Column("is_visible", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("hidden_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("hidden_reason", sa.String(120), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_foodcast_photos_author_id", "foodcast_photos", ["author_id"])
    op.create_index("ix_foodcast_photos_restaurant_id", "foodcast_photos", ["restaurant_id"])
    op.create_index("ix_foodcast_photos_city", "foodcast_photos", ["city"])
    op.create_index("ix_foodcast_photos_is_visible", "foodcast_photos", ["is_visible"])
    op.create_index("ix_foodcast_photos_created_at", "foodcast_photos", ["created_at"])

    op.create_table(
        "foodcast_photo_reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("photo_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("foodcast_photos.id", ondelete="CASCADE"), nullable=False),
        sa.Column("reporter_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("reporter_email", sa.String(320), nullable=True),
        sa.Column("reason", sa.String(40), nullable=False),
        sa.Column("note", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_foodcast_photo_reports_photo_id", "foodcast_photo_reports", ["photo_id"])
    op.create_index("ix_foodcast_photo_reports_reporter_id", "foodcast_photo_reports", ["reporter_id"])
    op.create_index("ix_foodcast_photo_reports_created_at", "foodcast_photo_reports", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_foodcast_photo_reports_created_at", table_name="foodcast_photo_reports")
    op.drop_index("ix_foodcast_photo_reports_reporter_id", table_name="foodcast_photo_reports")
    op.drop_index("ix_foodcast_photo_reports_photo_id", table_name="foodcast_photo_reports")
    op.drop_table("foodcast_photo_reports")
    op.drop_index("ix_foodcast_photos_created_at", table_name="foodcast_photos")
    op.drop_index("ix_foodcast_photos_is_visible", table_name="foodcast_photos")
    op.drop_index("ix_foodcast_photos_city", table_name="foodcast_photos")
    op.drop_index("ix_foodcast_photos_restaurant_id", table_name="foodcast_photos")
    op.drop_index("ix_foodcast_photos_author_id", table_name="foodcast_photos")
    op.drop_table("foodcast_photos")
