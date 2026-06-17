"""Social proof jobs, cache, mentions

Revision ID: 20260623_0046
Revises: 20260621_0044
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260623_0046"
down_revision = "20260621_0044"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "social_proof_cache",
        sa.Column("cache_key", sa.String(length=64), primary_key=True),
        sa.Column("query_normalized", sa.String(length=500), nullable=False),
        sa.Column("lat_bucket", sa.Float(), nullable=True),
        sa.Column("lng_bucket", sa.Float(), nullable=True),
        sa.Column("radius_km", sa.Float(), nullable=False, server_default="30"),
        sa.Column("mode", sa.String(length=20), nullable=False, server_default="trend"),
        sa.Column("status", sa.String(length=24), nullable=False, server_default="ready"),
        sa.Column("payload_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="{}"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_social_proof_cache_expires_at", "social_proof_cache", ["expires_at"])

    op.create_table(
        "social_proof_jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("cache_key", sa.String(length=64), nullable=False),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("query", sa.Text(), nullable=False),
        sa.Column("lat", sa.Float(), nullable=True),
        sa.Column("lng", sa.Float(), nullable=True),
        sa.Column("radius_km", sa.Float(), nullable=False, server_default="30"),
        sa.Column("city", sa.String(length=120), nullable=True),
        sa.Column("status", sa.String(length=24), nullable=False, server_default="pending"),
        sa.Column("progress_pct", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("cold_scan", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("places_snapshot_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_social_proof_jobs_cache_key", "social_proof_jobs", ["cache_key"])
    op.create_index("ix_social_proof_jobs_user_id", "social_proof_jobs", ["user_id"])
    op.create_index("ix_social_proof_jobs_status", "social_proof_jobs", ["status"])
    op.create_index("ix_social_proof_jobs_created_at", "social_proof_jobs", ["created_at"])

    op.create_table(
        "social_mentions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "job_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("social_proof_jobs.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("cache_key", sa.String(length=64), nullable=False),
        sa.Column("platform", sa.String(length=20), nullable=False),
        sa.Column("author_hash", sa.String(length=64), nullable=False),
        sa.Column("matched_place_id", sa.String(length=255), nullable=True),
        sa.Column(
            "matched_restaurant_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("restaurants.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("mention_text", sa.Text(), nullable=False),
        sa.Column("source_url", sa.String(length=1024), nullable=True),
        sa.Column("sentiment", sa.String(length=20), nullable=True),
        sa.Column("sentiment_score", sa.Float(), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_social_mentions_job_id", "social_mentions", ["job_id"])
    op.create_index("ix_social_mentions_cache_key", "social_mentions", ["cache_key"])
    op.create_index("ix_social_mentions_author_hash", "social_mentions", ["author_hash"])
    op.create_index("ix_social_mentions_matched_place_id", "social_mentions", ["matched_place_id"])
    op.create_index("ix_social_mentions_matched_restaurant_id", "social_mentions", ["matched_restaurant_id"])


def downgrade() -> None:
    op.drop_table("social_mentions")
    op.drop_table("social_proof_jobs")
    op.drop_table("social_proof_cache")
