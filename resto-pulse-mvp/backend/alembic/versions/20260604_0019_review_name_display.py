"""Yorum yazar adi gorunumu (tam / maskeli)

Revision ID: 20260604_0019
Revises: 20260603_0018
"""

from alembic import op
import sqlalchemy as sa

revision = "20260604_0019"
down_revision = "20260603_0018"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "default_review_name_display",
            sa.String(length=16),
            nullable=False,
            server_default="full",
        ),
    )
    op.add_column(
        "reviews",
        sa.Column(
            "author_name_display",
            sa.String(length=16),
            nullable=False,
            server_default="full",
        ),
    )


def downgrade() -> None:
    op.drop_column("reviews", "author_name_display")
    op.drop_column("users", "default_review_name_display")
