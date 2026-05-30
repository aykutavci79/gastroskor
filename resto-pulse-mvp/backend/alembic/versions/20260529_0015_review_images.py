"""review images

Revision ID: 20260529_0015
Revises: 20260529_0014
Create Date: 2026-05-29

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260529_0015"
down_revision = "20260529_0014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "review_images",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("review_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("image_url", sa.String(length=512), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["review_id"], ["reviews.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_review_images_review_id"), "review_images", ["review_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_review_images_review_id"), table_name="review_images")
    op.drop_table("review_images")
