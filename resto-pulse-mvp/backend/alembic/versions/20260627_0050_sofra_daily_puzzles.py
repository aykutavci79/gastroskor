"""Kelime Sofrasi gunluk bulmaca havuzu (Wordle tarzi)

Revision ID: 20260627_0050
Revises: 20260626_0049
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql

revision = "20260627_0050"
down_revision = "20260626_0049"
branch_labels = None
depends_on = None

review_status = postgresql.ENUM(
    "pending_review",
    "approved",
    "flagged",
    name="sofra_bulmaca_review_status",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)

    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE sofra_bulmaca_review_status AS ENUM ('pending_review', 'approved', 'flagged');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        """
    )

    if not insp.has_table("sofra_daily_puzzles"):
        op.create_table(
            "sofra_daily_puzzles",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("gun_id", sa.String(length=10), nullable=False),
            sa.Column("zorluk", sa.String(length=8), nullable=False),
            sa.Column("tur", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("puzzle_id", sa.String(length=32), nullable=False),
            sa.Column("puzzle_data", postgresql.JSONB(), nullable=False),
            sa.Column("is_fallback", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("source_gun_id", sa.String(length=10), nullable=True),
            sa.Column("generation_ms", sa.Integer(), nullable=True),
            sa.Column(
                "review_status",
                review_status,
                nullable=False,
                server_default="pending_review",
            ),
            sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("now()"),
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("now()"),
            ),
            sa.UniqueConstraint("gun_id", "zorluk", "tur", name="uq_sofra_daily_puzzles_slot"),
            sa.UniqueConstraint("puzzle_id", name="uq_sofra_daily_puzzles_puzzle_id"),
        )
        op.create_index("ix_sofra_daily_puzzles_gun_id", "sofra_daily_puzzles", ["gun_id"])
        op.create_index(
            "ix_sofra_daily_puzzles_review",
            "sofra_daily_puzzles",
            ["gun_id", "review_status"],
        )


def downgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    if insp.has_table("sofra_daily_puzzles"):
        op.drop_table("sofra_daily_puzzles")
    op.execute("DROP TYPE IF EXISTS sofra_bulmaca_review_status")
