"""KVKK hesap silme — deleted_at ve jeton/referral anonim FK

Revision ID: 20260627_0051
Revises: 20260627_0050
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql

revision = "20260627_0051"
down_revision = "20260627_0050"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    if not insp.has_table("users"):
        return

    user_cols = {c["name"] for c in insp.get_columns("users")}
    if "deleted_at" not in user_cols:
        op.add_column(
            "users",
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index("ix_users_deleted_at", "users", ["deleted_at"])

    if insp.has_table("jeton_ledger"):
        op.alter_column(
            "jeton_ledger",
            "user_id",
            existing_type=postgresql.UUID(as_uuid=True),
            nullable=True,
        )
        op.drop_constraint("jeton_ledger_user_id_fkey", "jeton_ledger", type_="foreignkey")
        op.create_foreign_key(
            "jeton_ledger_user_id_fkey",
            "jeton_ledger",
            "users",
            ["user_id"],
            ["id"],
            ondelete="SET NULL",
        )

    if insp.has_table("referrals"):
        op.alter_column(
            "referrals",
            "referrer_id",
            existing_type=postgresql.UUID(as_uuid=True),
            nullable=True,
        )
        op.alter_column(
            "referrals",
            "referred_id",
            existing_type=postgresql.UUID(as_uuid=True),
            nullable=True,
        )
        op.drop_constraint("referrals_referrer_id_fkey", "referrals", type_="foreignkey")
        op.drop_constraint("referrals_referred_id_fkey", "referrals", type_="foreignkey")
        op.create_foreign_key(
            "referrals_referrer_id_fkey",
            "referrals",
            "users",
            ["referrer_id"],
            ["id"],
            ondelete="SET NULL",
        )
        op.create_foreign_key(
            "referrals_referred_id_fkey",
            "referrals",
            "users",
            ["referred_id"],
            ["id"],
            ondelete="SET NULL",
        )


def downgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    if not insp.has_table("users"):
        return

    if insp.has_table("referrals"):
        op.drop_constraint("referrals_referred_id_fkey", "referrals", type_="foreignkey")
        op.drop_constraint("referrals_referrer_id_fkey", "referrals", type_="foreignkey")
        op.create_foreign_key(
            "referrals_referred_id_fkey",
            "referrals",
            "users",
            ["referred_id"],
            ["id"],
            ondelete="CASCADE",
        )
        op.create_foreign_key(
            "referrals_referrer_id_fkey",
            "referrals",
            "users",
            ["referrer_id"],
            ["id"],
            ondelete="CASCADE",
        )
        op.alter_column(
            "referrals",
            "referred_id",
            existing_type=postgresql.UUID(as_uuid=True),
            nullable=False,
        )
        op.alter_column(
            "referrals",
            "referrer_id",
            existing_type=postgresql.UUID(as_uuid=True),
            nullable=False,
        )

    if insp.has_table("jeton_ledger"):
        op.drop_constraint("jeton_ledger_user_id_fkey", "jeton_ledger", type_="foreignkey")
        op.create_foreign_key(
            "jeton_ledger_user_id_fkey",
            "jeton_ledger",
            "users",
            ["user_id"],
            ["id"],
            ondelete="CASCADE",
        )
        op.alter_column(
            "jeton_ledger",
            "user_id",
            existing_type=postgresql.UUID(as_uuid=True),
            nullable=False,
        )

    user_cols = {c["name"] for c in insp.get_columns("users")}
    if "deleted_at" in user_cols:
        op.drop_index("ix_users_deleted_at", table_name="users")
        op.drop_column("users", "deleted_at")
