"""Arkadaslik istekleri (onay akisi)

Revision ID: 20260612_0029
Revises: 20260612_0028
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260612_0029"
down_revision = "20260612_0028"
branch_labels = None
depends_on = None

friend_request_status = sa.Enum(
    "pending",
    "accepted",
    "rejected",
    "cancelled",
    "blocked",
    name="friendrequeststatus",
)


def upgrade() -> None:
    friend_request_status.create(op.get_bind(), checkfirst=True)
    op.create_table(
        "friend_requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("from_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("to_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", friend_request_status, nullable=False, server_default="pending"),
        sa.Column("rejection_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_rejected_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("responded_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("from_user_id", "to_user_id", name="uq_friend_request_pair"),
    )
    op.create_index("ix_friend_requests_from_user_id", "friend_requests", ["from_user_id"])
    op.create_index("ix_friend_requests_to_user_id", "friend_requests", ["to_user_id"])
    op.create_index("ix_friend_requests_status", "friend_requests", ["status"])
    op.create_index("ix_friend_requests_created_at", "friend_requests", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_friend_requests_created_at", table_name="friend_requests")
    op.drop_index("ix_friend_requests_status", table_name="friend_requests")
    op.drop_index("ix_friend_requests_to_user_id", table_name="friend_requests")
    op.drop_index("ix_friend_requests_from_user_id", table_name="friend_requests")
    op.drop_table("friend_requests")
    friend_request_status.drop(op.get_bind(), checkfirst=True)
