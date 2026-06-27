"""search_query_log — Google arama sorgu gunlugu."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260630_0057"
down_revision = "20260630_0056"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "search_query_log",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("query_key", sa.String(255), nullable=False),
        sa.Column("city", sa.String(120), nullable=False),
        sa.Column("google_fetched_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("result_count", sa.Integer(), nullable=False, server_default="0"),
        sa.UniqueConstraint("query_key", "city", name="uq_search_query_log_key_city"),
    )
    op.create_index("ix_search_query_log_query_key", "search_query_log", ["query_key"])
    op.create_index("ix_search_query_log_city", "search_query_log", ["city"])
    op.create_index("ix_search_query_log_google_fetched_at", "search_query_log", ["google_fetched_at"])


def downgrade() -> None:
    op.drop_index("ix_search_query_log_google_fetched_at", table_name="search_query_log")
    op.drop_index("ix_search_query_log_city", table_name="search_query_log")
    op.drop_index("ix_search_query_log_query_key", table_name="search_query_log")
    op.drop_table("search_query_log")
