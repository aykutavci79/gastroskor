"""init schema

Revision ID: 20260526_0001
Revises:
Create Date: 2026-05-26 17:53:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "20260526_0001"
down_revision = None
branch_labels = None
depends_on = None


platformname = postgresql.ENUM(
    "google_maps", "yemeksepeti", "tripadvisor", name="platformname", create_type=False
)
sentimentlabel = postgresql.ENUM(
    "positive", "neutral", "negative", name="sentimentlabel", create_type=False
)


def upgrade() -> None:
    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE platformname AS ENUM ('google_maps', 'yemeksepeti', 'tripadvisor');
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
        """
    )
    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE sentimentlabel AS ENUM ('positive', 'neutral', 'negative');
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
        """
    )

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=True),
        sa.Column("avatar_url", sa.String(length=1024), nullable=True),
        sa.Column("google_sub", sa.String(length=255), nullable=True),
        sa.Column("role", sa.String(length=30), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_index(op.f("ix_users_google_sub"), "users", ["google_sub"], unique=True)

    op.create_table(
        "restaurants",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("city", sa.String(length=120), nullable=True),
        sa.Column("district", sa.String(length=120), nullable=True),
        sa.Column("address", sa.String(length=500), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("category", sa.String(length=120), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_restaurants_city"), "restaurants", ["city"], unique=False)
    op.create_index(op.f("ix_restaurants_district"), "restaurants", ["district"], unique=False)
    op.create_index(op.f("ix_restaurants_name"), "restaurants", ["name"], unique=False)

    op.create_table(
        "restaurant_platform_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("restaurant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("platform", platformname, nullable=False),
        sa.Column("external_id", sa.String(length=255), nullable=False),
        sa.Column("profile_url", sa.String(length=1024), nullable=True),
        sa.Column("avg_rating", sa.Float(), nullable=True),
        sa.Column("review_count", sa.Integer(), nullable=True),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["restaurant_id"], ["restaurants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("platform", "external_id", name="uq_platform_external_id"),
        sa.UniqueConstraint("restaurant_id", "platform", name="uq_restaurant_platform"),
    )
    op.create_index(
        op.f("ix_restaurant_platform_profiles_external_id"),
        "restaurant_platform_profiles",
        ["external_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_restaurant_platform_profiles_platform"),
        "restaurant_platform_profiles",
        ["platform"],
        unique=False,
    )
    op.create_index(
        op.f("ix_restaurant_platform_profiles_restaurant_id"),
        "restaurant_platform_profiles",
        ["restaurant_id"],
        unique=False,
    )

    op.create_table(
        "reviews",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("restaurant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("author_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("source_platform", platformname, nullable=True),
        sa.Column("source_review_id", sa.String(length=255), nullable=True),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("review_text", sa.Text(), nullable=False),
        sa.Column("review_lang", sa.String(length=10), nullable=True),
        sa.Column("sentiment_label", sentimentlabel, nullable=True),
        sa.Column("sentiment_score", sa.Float(), nullable=True),
        sa.Column("ai_summary", sa.Text(), nullable=True),
        sa.Column("ai_raw_payload", sa.JSON(), nullable=True),
        sa.Column("published_to_google", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["restaurant_id"], ["restaurants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_reviews_author_id"), "reviews", ["author_id"], unique=False)
    op.create_index(op.f("ix_reviews_restaurant_id"), "reviews", ["restaurant_id"], unique=False)
    op.create_index(op.f("ix_reviews_source_platform"), "reviews", ["source_platform"], unique=False)

    op.create_table(
        "review_category_scores",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("review_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("category", sa.String(length=40), nullable=False),
        sa.Column("score", sa.Float(), nullable=True),
        sa.Column("label", sentimentlabel, nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["review_id"], ["reviews.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("review_id", "category", name="uq_review_category"),
    )
    op.create_index(
        op.f("ix_review_category_scores_category"),
        "review_category_scores",
        ["category"],
        unique=False,
    )
    op.create_index(
        op.f("ix_review_category_scores_review_id"),
        "review_category_scores",
        ["review_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_review_category_scores_review_id"), table_name="review_category_scores")
    op.drop_index(op.f("ix_review_category_scores_category"), table_name="review_category_scores")
    op.drop_table("review_category_scores")

    op.drop_index(op.f("ix_reviews_source_platform"), table_name="reviews")
    op.drop_index(op.f("ix_reviews_restaurant_id"), table_name="reviews")
    op.drop_index(op.f("ix_reviews_author_id"), table_name="reviews")
    op.drop_table("reviews")

    op.drop_index(
        op.f("ix_restaurant_platform_profiles_restaurant_id"),
        table_name="restaurant_platform_profiles",
    )
    op.drop_index(op.f("ix_restaurant_platform_profiles_platform"), table_name="restaurant_platform_profiles")
    op.drop_index(op.f("ix_restaurant_platform_profiles_external_id"), table_name="restaurant_platform_profiles")
    op.drop_table("restaurant_platform_profiles")

    op.drop_index(op.f("ix_restaurants_name"), table_name="restaurants")
    op.drop_index(op.f("ix_restaurants_district"), table_name="restaurants")
    op.drop_index(op.f("ix_restaurants_city"), table_name="restaurants")
    op.drop_table("restaurants")

    op.drop_index(op.f("ix_users_google_sub"), table_name="users")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")

    op.execute("DROP TYPE IF EXISTS sentimentlabel")
    op.execute("DROP TYPE IF EXISTS platformname")

