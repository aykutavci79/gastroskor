"""Arkadas listesi + ozel mesaj (DM)

Revision ID: 20260611_0027
Revises: 20260610_0026
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260611_0027"
down_revision = "20260610_0026"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_friendships",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("friend_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("user_id", "friend_user_id", name="uq_user_friendship"),
    )
    op.create_index("ix_user_friendships_user_id", "user_friendships", ["user_id"])
    op.create_index("ix_user_friendships_friend_user_id", "user_friendships", ["friend_user_id"])
    op.create_index("ix_user_friendships_created_at", "user_friendships", ["created_at"])

    op.create_table(
        "dm_threads",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_low_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_high_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("last_message_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("user_low_id", "user_high_id", name="uq_dm_thread_pair"),
    )
    op.create_index("ix_dm_threads_user_low_id", "dm_threads", ["user_low_id"])
    op.create_index("ix_dm_threads_user_high_id", "dm_threads", ["user_high_id"])
    op.create_index("ix_dm_threads_updated_at", "dm_threads", ["updated_at"])
    op.create_index("ix_dm_threads_last_message_at", "dm_threads", ["last_message_at"])

    op.create_table(
        "dm_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("thread_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("dm_threads.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sender_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_dm_messages_thread_id", "dm_messages", ["thread_id"])
    op.create_index("ix_dm_messages_sender_id", "dm_messages", ["sender_id"])
    op.create_index("ix_dm_messages_created_at", "dm_messages", ["created_at"])

    op.create_table(
        "dm_read_states",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("thread_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("dm_threads.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("last_read_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("thread_id", "user_id", name="uq_dm_read_state"),
    )
    op.create_index("ix_dm_read_states_thread_id", "dm_read_states", ["thread_id"])
    op.create_index("ix_dm_read_states_user_id", "dm_read_states", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_dm_read_states_user_id", table_name="dm_read_states")
    op.drop_index("ix_dm_read_states_thread_id", table_name="dm_read_states")
    op.drop_table("dm_read_states")
    op.drop_index("ix_dm_messages_created_at", table_name="dm_messages")
    op.drop_index("ix_dm_messages_sender_id", table_name="dm_messages")
    op.drop_index("ix_dm_messages_thread_id", table_name="dm_messages")
    op.drop_table("dm_messages")
    op.drop_index("ix_dm_threads_last_message_at", table_name="dm_threads")
    op.drop_index("ix_dm_threads_updated_at", table_name="dm_threads")
    op.drop_index("ix_dm_threads_user_high_id", table_name="dm_threads")
    op.drop_index("ix_dm_threads_user_low_id", table_name="dm_threads")
    op.drop_table("dm_threads")
    op.drop_index("ix_user_friendships_created_at", table_name="user_friendships")
    op.drop_index("ix_user_friendships_friend_user_id", table_name="user_friendships")
    op.drop_index("ix_user_friendships_user_id", table_name="user_friendships")
    op.drop_table("user_friendships")
