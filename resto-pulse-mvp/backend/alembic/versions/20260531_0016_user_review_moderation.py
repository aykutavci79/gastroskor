"""user review moderation strikes and ban

Revision ID: 20260531_0016
Revises: 20260529_0015
Create Date: 2026-05-31
"""

from alembic import op
import sqlalchemy as sa

revision = "20260531_0016"
down_revision = "20260529_0015"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("review_moderation_strikes", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "users",
        sa.Column("review_banned_until", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "review_banned_until")
    op.drop_column("users", "review_moderation_strikes")
