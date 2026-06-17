"""Social proof jobs, cache, mentions

Revision ID: 20260623_0046
Revises: 20260621_0044
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql

revision = "20260623_0046"
down_revision = "20260621_0044"
branch_labels = None
depends_on = None


def _index_names(table: str, bind) -> set[str]:
    return {idx["name"] for idx in inspect(bind).get_indexes(table)}


def upgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)

    if not insp.has_table("social_proof_cache"):
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
    if insp.has_table("social_proof_cache"):
        cache_indexes = _index_names("social_proof_cache", bind)
        if "ix_social_proof_cache_expires_at" not in cache_indexes:
            op.create_index("ix_social_proof_cache_expires_at", "social_proof_cache", ["expires_at"])

    if not insp.has_table("social_proof_jobs"):
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
    if insp.has_table("social_proof_jobs"):
        job_indexes = _index_names("social_proof_jobs", bind)
        for name, cols in (
            ("ix_social_proof_jobs_cache_key", ["cache_key"]),
            ("ix_social_proof_jobs_user_id", ["user_id"]),
            ("ix_social_proof_jobs_status", ["status"]),
            ("ix_social_proof_jobs_created_at", ["created_at"]),
        ):
            if name not in job_indexes:
                op.create_index(name, "social_proof_jobs", cols)

    if not insp.has_table("social_mentions"):
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
    if insp.has_table("social_mentions"):
        mention_indexes = _index_names("social_mentions", bind)
        for name, cols in (
            ("ix_social_mentions_job_id", ["job_id"]),
            ("ix_social_mentions_cache_key", ["cache_key"]),
            ("ix_social_mentions_author_hash", ["author_hash"]),
            ("ix_social_mentions_matched_place_id", ["matched_place_id"]),
            ("ix_social_mentions_matched_restaurant_id", ["matched_restaurant_id"]),
        ):
            if name not in mention_indexes:
                op.create_index(name, "social_mentions", cols)


def downgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    if insp.has_table("social_mentions"):
        op.drop_table("social_mentions")
    if insp.has_table("social_proof_jobs"):
        op.drop_table("social_proof_jobs")
    if insp.has_table("social_proof_cache"):
        op.drop_table("social_proof_cache")
