"""Gurme Sohbetler — oda isimleri + akan mesajlar

Revision ID: 20260610_0026
Revises: 20260609_0025
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260610_0026"
down_revision = "20260609_0025"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        sa.text("UPDATE gourmet_chat_rooms SET title = 'Kes Dönerciler' WHERE slug = 'kes-donerciler'")
    )
    op.execute(
        sa.text(
            "UPDATE gourmet_chat_rooms SET title = 'Gece Acıkanlar', "
            "description = 'Gece acıkanlara atıştırmalık ve mekan sohbetleri' "
            "WHERE slug = 'gece-acikanlar'"
        )
    )

    op.create_table(
        "gourmet_chat_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("room_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("gourmet_chat_rooms.id", ondelete="CASCADE"), nullable=False),
        sa.Column("author_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("city", sa.String(length=64), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("mentions_json", postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_gourmet_chat_messages_room_city", "gourmet_chat_messages", ["room_id", "city"])
    op.create_index("ix_gourmet_chat_messages_created_at", "gourmet_chat_messages", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_gourmet_chat_messages_created_at", table_name="gourmet_chat_messages")
    op.drop_index("ix_gourmet_chat_messages_room_city", table_name="gourmet_chat_messages")
    op.drop_table("gourmet_chat_messages")
