"""Siparis telefonu SMS dogrulama

Revision ID: 20260613_0035
Revises: 20260613_0034
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260613_0035"
down_revision = "20260613_0034"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("order_phone_e164", sa.String(length=32), nullable=True))
    op.add_column("users", sa.Column("order_phone_verified_at", sa.DateTime(timezone=True), nullable=True))

    op.create_table(
        "user_order_phone_otps",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("phone_e164", sa.String(length=32), nullable=False),
        sa.Column("code_hash", sa.String(length=128), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("consumed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_user_order_phone_otps_user_id", "user_order_phone_otps", ["user_id"])


def downgrade() -> None:
    op.drop_table("user_order_phone_otps")
    op.drop_column("users", "order_phone_verified_at")
    op.drop_column("users", "order_phone_e164")
