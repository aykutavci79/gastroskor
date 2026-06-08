"""Gurme BilBakalim trivia botu

Revision ID: 20260613_0036
Revises: 20260613_0035
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260613_0036"
down_revision = "20260613_0035"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "gourmet_trivia_questions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("question_text", sa.Text(), nullable=False),
        sa.Column("answers_json", postgresql.JSONB(), nullable=False),
        sa.Column("room_tag", sa.String(length=40), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_gourmet_trivia_questions_room_tag", "gourmet_trivia_questions", ["room_tag"])

    op.create_table(
        "gourmet_trivia_rounds",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("room_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("city", sa.String(length=64), nullable=False),
        sa.Column("question_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="open"),
        sa.Column("winner_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("question_message_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("opened_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["room_id"], ["gourmet_chat_rooms.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["question_id"], ["gourmet_trivia_questions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["winner_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["question_message_id"], ["gourmet_chat_messages.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_gourmet_trivia_rounds_room_city", "gourmet_trivia_rounds", ["room_id", "city"])
    op.create_index("ix_gourmet_trivia_rounds_status", "gourmet_trivia_rounds", ["status"])

    op.create_table(
        "gourmet_trivia_scores",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("room_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("city", sa.String(length=64), nullable=False),
        sa.Column("correct_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_correct_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["room_id"], ["gourmet_chat_rooms.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", "room_id", "city", name="uq_gourmet_trivia_score"),
    )


def downgrade() -> None:
    op.drop_table("gourmet_trivia_scores")
    op.drop_table("gourmet_trivia_rounds")
    op.drop_table("gourmet_trivia_questions")
