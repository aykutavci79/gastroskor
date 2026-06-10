"""Panel AI analiz rapor gecmisi (ozet-only, alinti yok)

Revision ID: 20260615_0038
Revises: 20260614_0037
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260615_0038"
down_revision = "20260614_0037"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "restaurant_ai_analysis_reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "ownership_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("restaurant_ownerships.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "competitor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("restaurant_competitors.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("competitor_name", sa.String(length=255), nullable=False),
        sa.Column("comparison_summary", sa.Text(), nullable=False),
        sa.Column("your_strengths_json", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("your_gaps_json", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("competitor_strengths_json", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("reviews_used_json", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index(
        op.f("ix_restaurant_ai_analysis_reports_ownership_id"),
        "restaurant_ai_analysis_reports",
        ["ownership_id"],
    )
    op.create_index(
        op.f("ix_restaurant_ai_analysis_reports_created_at"),
        "restaurant_ai_analysis_reports",
        ["created_at"],
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_restaurant_ai_analysis_reports_created_at"), table_name="restaurant_ai_analysis_reports")
    op.drop_index(op.f("ix_restaurant_ai_analysis_reports_ownership_id"), table_name="restaurant_ai_analysis_reports")
    op.drop_table("restaurant_ai_analysis_reports")
