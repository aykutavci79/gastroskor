"""Google Business Profile baglantisi ve rapor kaynagi

Revision ID: 20260616_0039
Revises: 20260615_0038
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260616_0039"
down_revision = "20260615_0038"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "restaurant_google_business_connections",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "ownership_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("restaurant_ownerships.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("google_email", sa.String(length=255), nullable=True),
        sa.Column("gbp_account_name", sa.String(length=120), nullable=True),
        sa.Column("gbp_location_name", sa.String(length=160), nullable=True),
        sa.Column("gbp_location_title", sa.String(length=255), nullable=True),
        sa.Column("matched_place_id", sa.String(length=255), nullable=True),
        sa.Column("refresh_token_enc", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="connected"),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("last_sync_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_review_count", sa.Integer(), nullable=True),
        sa.Column("connected_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("ownership_id", name="uq_google_business_connection_ownership"),
    )
    op.create_index(
        op.f("ix_restaurant_google_business_connections_ownership_id"),
        "restaurant_google_business_connections",
        ["ownership_id"],
    )

    op.add_column(
        "restaurant_ai_analysis_reports",
        sa.Column("report_source", sa.String(length=30), nullable=False, server_default="competitor"),
    )
    op.add_column(
        "restaurant_ai_analysis_reports",
        sa.Column("reviews_total", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("restaurant_ai_analysis_reports", "reviews_total")
    op.drop_column("restaurant_ai_analysis_reports", "report_source")
    op.drop_index(
        op.f("ix_restaurant_google_business_connections_ownership_id"),
        table_name="restaurant_google_business_connections",
    )
    op.drop_table("restaurant_google_business_connections")
