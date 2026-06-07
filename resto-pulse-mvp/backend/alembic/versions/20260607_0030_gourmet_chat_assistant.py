"""Gurme sohbet asistani — zamanlanmis cevaplar

Revision ID: 20260607_0030
Revises: 20260612_0029
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260607_0030"
down_revision = "20260612_0029"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "gourmet_chat_room_assistant_state",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("room_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("gourmet_chat_rooms.id", ondelete="CASCADE"), nullable=False),
        sa.Column("city", sa.String(length=64), nullable=False),
        sa.Column("muted_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("room_id", "city", name="uq_gourmet_chat_assistant_room_city"),
    )
    op.create_index(
        "ix_gourmet_chat_assistant_state_muted_until",
        "gourmet_chat_room_assistant_state",
        ["muted_until"],
    )

    op.create_table(
        "gourmet_chat_assistant_jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("room_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("gourmet_chat_rooms.id", ondelete="CASCADE"), nullable=False),
        sa.Column("city", sa.String(length=64), nullable=False),
        sa.Column("trigger_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("trigger_message_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("gourmet_chat_messages.id", ondelete="CASCADE"), nullable=False),
        sa.Column("job_kind", sa.String(length=20), nullable=False),
        sa.Column("intent", sa.String(length=20), nullable=False),
        sa.Column("run_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="pending", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index(
        "ix_gourmet_chat_assistant_jobs_run_at_status",
        "gourmet_chat_assistant_jobs",
        ["run_at", "status"],
    )
    op.create_index(
        "ix_gourmet_chat_assistant_jobs_room_city_status",
        "gourmet_chat_assistant_jobs",
        ["room_id", "city", "status"],
    )


def downgrade() -> None:
    op.drop_index("ix_gourmet_chat_assistant_jobs_room_city_status", table_name="gourmet_chat_assistant_jobs")
    op.drop_index("ix_gourmet_chat_assistant_jobs_run_at_status", table_name="gourmet_chat_assistant_jobs")
    op.drop_table("gourmet_chat_assistant_jobs")
    op.drop_index("ix_gourmet_chat_assistant_state_muted_until", table_name="gourmet_chat_room_assistant_state")
    op.drop_table("gourmet_chat_room_assistant_state")
