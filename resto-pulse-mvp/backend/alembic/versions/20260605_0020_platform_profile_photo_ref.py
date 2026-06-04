"""Google Places foto referansi (kart kapagi)

Revision ID: 20260605_0020
Revises: 20260604_0019
"""

from alembic import op
import sqlalchemy as sa

revision = "20260605_0020"
down_revision = "20260604_0019"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "restaurant_platform_profiles",
        sa.Column("photo_reference", sa.String(length=512), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("restaurant_platform_profiles", "photo_reference")
