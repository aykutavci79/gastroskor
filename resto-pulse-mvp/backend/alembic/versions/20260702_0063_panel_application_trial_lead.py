"""Panel basvuru — deneme lead (vergi/sozlesme opsiyonel)"""

from alembic import op
import sqlalchemy as sa

revision = "20260702_0063"
down_revision = "20260702_0062"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("restaurant_panel_applications", "tax_document_key", existing_type=sa.String(512), nullable=True)
    op.alter_column(
        "restaurant_panel_applications", "tax_document_content_type", existing_type=sa.String(80), nullable=True
    )
    op.alter_column("restaurant_panel_applications", "contract_version", existing_type=sa.String(40), nullable=True)
    op.alter_column(
        "restaurant_panel_applications", "contract_accepted_at", existing_type=sa.DateTime(timezone=True), nullable=True
    )


def downgrade() -> None:
    op.alter_column(
        "restaurant_panel_applications", "contract_accepted_at", existing_type=sa.DateTime(timezone=True), nullable=False
    )
    op.alter_column("restaurant_panel_applications", "contract_version", existing_type=sa.String(40), nullable=False)
    op.alter_column(
        "restaurant_panel_applications", "tax_document_content_type", existing_type=sa.String(80), nullable=False
    )
    op.alter_column("restaurant_panel_applications", "tax_document_key", existing_type=sa.String(512), nullable=False)
