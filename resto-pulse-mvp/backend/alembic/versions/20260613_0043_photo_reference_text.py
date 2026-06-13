"""Google photo_reference uzunlugu (Places API yeni tokenlari)

Revision ID: 20260613_0043
Revises: 20260619_0042
"""

from alembic import op
import sqlalchemy as sa

revision = "20260613_0043"
down_revision = "20260619_0042"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "google_place_catalog",
        "photo_reference",
        existing_type=sa.String(length=512),
        type_=sa.Text(),
        existing_nullable=True,
    )
    op.alter_column(
        "restaurant_platform_profiles",
        "photo_reference",
        existing_type=sa.String(length=512),
        type_=sa.Text(),
        existing_nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "restaurant_platform_profiles",
        "photo_reference",
        existing_type=sa.Text(),
        type_=sa.String(length=512),
        existing_nullable=True,
    )
    op.alter_column(
        "google_place_catalog",
        "photo_reference",
        existing_type=sa.Text(),
        type_=sa.String(length=512),
        existing_nullable=True,
    )
