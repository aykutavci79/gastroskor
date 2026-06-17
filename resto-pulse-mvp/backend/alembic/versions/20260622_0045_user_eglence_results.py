"""User eglence game results for friend leaderboards

Revision ID: 20260622_0045
Revises: 20260621_0044
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql

revision = "20260622_0045"
down_revision = "20260621_0044"
branch_labels = None
depends_on = None


def _index_names(table: str, bind) -> set[str]:
    return {idx["name"] for idx in inspect(bind).get_indexes(table)}


def upgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)

    if not insp.has_table("user_eglence_results"):
        op.create_table(
            "user_eglence_results",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column(
                "user_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("game", sa.String(length=32), nullable=False),
            sa.Column("period_key", sa.String(length=32), nullable=False),
            sa.Column("elapsed_ms", sa.Integer(), nullable=True),
            sa.Column("score", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.UniqueConstraint("user_id", "game", "period_key", name="uq_user_eglence_period"),
        )
    if insp.has_table("user_eglence_results"):
        indexes = _index_names("user_eglence_results", bind)
        for name, cols in (
            ("ix_user_eglence_results_user_id", ["user_id"]),
            ("ix_user_eglence_results_game", ["game"]),
            ("ix_user_eglence_results_period_key", ["period_key"]),
            ("ix_user_eglence_results_game_period", ["game", "period_key"]),
        ):
            if name not in indexes:
                op.create_index(name, "user_eglence_results", cols)


def downgrade() -> None:
    bind = op.get_bind()
    if inspect(bind).has_table("user_eglence_results"):
        op.drop_table("user_eglence_results")
