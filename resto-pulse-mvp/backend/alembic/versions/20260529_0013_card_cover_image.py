"""restaurant card cover image separate from menu photo

Revision ID: 20260529_0013
Revises: 20260529_0012
Create Date: 2026-05-29

"""

from alembic import op
import sqlalchemy as sa

revision = "20260529_0013"
down_revision = "20260529_0012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "restaurant_ownerships",
        sa.Column("promo_card_cover_image_url", sa.String(length=1024), nullable=True),
    )
    # Mevcut yuklemeler kartta kalsin; menu alani ayri yonetilir
    op.execute(
        """
        UPDATE restaurant_ownerships
        SET promo_card_cover_image_url = promo_menu_image_url
        WHERE promo_menu_image_url IS NOT NULL
          AND (promo_card_cover_image_url IS NULL OR promo_card_cover_image_url = '')
        """
    )


def downgrade() -> None:
    op.drop_column("restaurant_ownerships", "promo_card_cover_image_url")
