"""Google canli arama sonuc havuzu

Revision ID: 20260618_0041
Revises: 20260617_0040
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260618_0041"
down_revision = "20260617_0040"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "google_place_catalog",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("google_place_id", sa.String(255), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("name_normalized", sa.String(255), nullable=False),
        sa.Column("city", sa.String(120), nullable=False),
        sa.Column("address", sa.String(500), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("rating", sa.Float(), nullable=True),
        sa.Column("user_ratings_total", sa.Integer(), nullable=True),
        sa.Column("photo_reference", sa.String(512), nullable=True),
        sa.Column("restaurant_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("seen_count", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("last_source_query", sa.String(255), nullable=True),
        sa.Column("first_seen_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["restaurant_id"], ["restaurants.id"], ondelete="SET NULL"),
        sa.UniqueConstraint("google_place_id", name="uq_google_place_catalog_place_id"),
    )
    op.create_index("ix_google_place_catalog_google_place_id", "google_place_catalog", ["google_place_id"])
    op.create_index("ix_google_place_catalog_name", "google_place_catalog", ["name"])
    op.create_index("ix_google_place_catalog_name_normalized", "google_place_catalog", ["name_normalized"])
    op.create_index("ix_google_place_catalog_city", "google_place_catalog", ["city"])
    op.create_index("ix_google_place_catalog_restaurant_id", "google_place_catalog", ["restaurant_id"])


def downgrade() -> None:
    op.drop_index("ix_google_place_catalog_restaurant_id", table_name="google_place_catalog")
    op.drop_index("ix_google_place_catalog_city", table_name="google_place_catalog")
    op.drop_index("ix_google_place_catalog_name_normalized", table_name="google_place_catalog")
    op.drop_index("ix_google_place_catalog_name", table_name="google_place_catalog")
    op.drop_index("ix_google_place_catalog_google_place_id", table_name="google_place_catalog")
    op.drop_table("google_place_catalog")
