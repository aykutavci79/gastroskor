"""review helpful votes and user replies

Revision ID: 20260531_0017
Revises: 20260531_0016
Create Date: 2026-05-31
"""

from alembic import op
import sqlalchemy as sa

revision = "20260531_0017"
down_revision = "20260531_0016"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "review_helpful_votes",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("review_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["review_id"], ["reviews.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("review_id", "user_id", name="uq_review_helpful_vote"),
    )
    op.create_index("ix_review_helpful_votes_review_id", "review_helpful_votes", ["review_id"])
    op.create_index("ix_review_helpful_votes_user_id", "review_helpful_votes", ["user_id"])

    op.create_table(
        "review_replies",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("review_id", sa.UUID(), nullable=False),
        sa.Column("author_id", sa.UUID(), nullable=True),
        sa.Column("reply_text", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["review_id"], ["reviews.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_review_replies_review_id", "review_replies", ["review_id"])
    op.create_index("ix_review_replies_author_id", "review_replies", ["author_id"])


def downgrade() -> None:
    op.drop_index("ix_review_replies_author_id", table_name="review_replies")
    op.drop_index("ix_review_replies_review_id", table_name="review_replies")
    op.drop_table("review_replies")
    op.drop_index("ix_review_helpful_votes_user_id", table_name="review_helpful_votes")
    op.drop_index("ix_review_helpful_votes_review_id", table_name="review_helpful_votes")
    op.drop_table("review_helpful_votes")
