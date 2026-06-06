"""Gurme Sohbetler — odalar, sorular, cevaplar

Revision ID: 20260609_0025
Revises: 20260608_0024
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260609_0025"
down_revision = "20260608_0024"
branch_labels = None
depends_on = None

ROOMS = [
    ("kes-donerciler", "Keş Dönerciler", "Döner, dürüm ve kebap tavsiyeleri", "🥙", 1),
    ("ocakbasi-muhabbeti", "Ocakbaşı Muhabbeti", "Mangal, ocakbaşı ve ızgara sohbetleri", "🔥", 2),
    ("anne-eli-ev-yemegi", "Anne Eli Ev Yemeği", "Ev yemeği, lokanta ve sulu yemek önerileri", "🍲", 3),
    ("gece-acikanlar", "Gece Açık Olanlar", "Gece açık mekanlar ve atıştırmalıklar", "🌙", 4),
    ("fiyat-performans-avcilari", "Fiyat-Performans Avcıları", "Uygun fiyat, doyurucu lezzet avı", "💰", 5),
    ("gizli-kalmis-mekanlar", "Gizli Kalmış Mekanlar", "Az bilinen ama iyi mekan keşifleri", "🗺️", 6),
]


def upgrade() -> None:
    op.create_table(
        "gourmet_chat_rooms",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("slug", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=120), nullable=False),
        sa.Column("description", sa.String(length=280), nullable=False, server_default=""),
        sa.Column("emoji", sa.String(length=8), nullable=False, server_default="💬"),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_system", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("allow_restaurant_cards", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("slug", name="uq_gourmet_chat_room_slug"),
    )
    op.create_index("ix_gourmet_chat_rooms_sort_order", "gourmet_chat_rooms", ["sort_order"])

    op.create_table(
        "gourmet_chat_questions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("room_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("gourmet_chat_rooms.id", ondelete="CASCADE"), nullable=False),
        sa.Column("author_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("city", sa.String(length=64), nullable=False),
        sa.Column("tag", sa.String(length=32), nullable=False, server_default="genel"),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("answer_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_gourmet_chat_questions_room_city", "gourmet_chat_questions", ["room_id", "city"])
    op.create_index("ix_gourmet_chat_questions_created_at", "gourmet_chat_questions", ["created_at"])

    op.create_table(
        "gourmet_chat_answers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("question_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("gourmet_chat_questions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("author_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_gourmet_chat_answers_question_id", "gourmet_chat_answers", ["question_id"])
    op.create_index("ix_gourmet_chat_answers_created_at", "gourmet_chat_answers", ["created_at"])

    rooms_table = sa.table(
        "gourmet_chat_rooms",
        sa.column("slug", sa.String),
        sa.column("title", sa.String),
        sa.column("description", sa.String),
        sa.column("emoji", sa.String),
        sa.column("sort_order", sa.Integer),
        sa.column("is_system", sa.Boolean),
        sa.column("allow_restaurant_cards", sa.Boolean),
    )
    op.bulk_insert(
        rooms_table,
        [
            {
                "slug": slug,
                "title": title,
                "description": desc,
                "emoji": emoji,
                "sort_order": order,
                "is_system": True,
                "allow_restaurant_cards": False,
            }
            for slug, title, desc, emoji, order in ROOMS
        ],
    )


def downgrade() -> None:
    op.drop_index("ix_gourmet_chat_answers_created_at", table_name="gourmet_chat_answers")
    op.drop_index("ix_gourmet_chat_answers_question_id", table_name="gourmet_chat_answers")
    op.drop_table("gourmet_chat_answers")
    op.drop_index("ix_gourmet_chat_questions_created_at", table_name="gourmet_chat_questions")
    op.drop_index("ix_gourmet_chat_questions_room_city", table_name="gourmet_chat_questions")
    op.drop_table("gourmet_chat_questions")
    op.drop_index("ix_gourmet_chat_rooms_sort_order", table_name="gourmet_chat_rooms")
    op.drop_table("gourmet_chat_rooms")
