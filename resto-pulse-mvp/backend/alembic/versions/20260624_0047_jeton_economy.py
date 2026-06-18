"""Jeton wallet, ledger, referrals, follow rewards

Revision ID: 20260624_0047
Revises: 20260623_0046
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql

revision = "20260624_0047"
down_revision = "20260623_0046"
branch_labels = None
depends_on = None

jeton_source = postgresql.ENUM(
    "order",
    "follow",
    "referral",
    "clawback",
    "game_spend",
    "manual_adjustment",
    name="jetonledgersource",
    create_type=False,
)
jeton_status = postgresql.ENUM(
    "posted",
    "pending",
    "rejected",
    name="jetonledgerstatus",
    create_type=False,
)
referral_status = postgresql.ENUM(
    "pending",
    "rewarded",
    "flagged",
    "rejected",
    name="referralstatus",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)

    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE jetonledgersource AS ENUM (
                'order', 'follow', 'referral', 'clawback', 'game_spend', 'manual_adjustment'
            );
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        """
    )
    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE jetonledgerstatus AS ENUM ('posted', 'pending', 'rejected');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        """
    )
    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE referralstatus AS ENUM ('pending', 'rewarded', 'flagged', 'rejected');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        """
    )

    if not insp.has_table("wallets"):
        op.create_table(
            "wallets",
            sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
            sa.Column("balance", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        )

    user_cols = {c["name"] for c in insp.get_columns("users")} if insp.has_table("users") else set()
    if "first_order_bonus_claimed" not in user_cols:
        op.add_column(
            "users",
            sa.Column("first_order_bonus_claimed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        )

    if not insp.has_table("jeton_ledger"):
        op.create_table(
            "jeton_ledger",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("source", jeton_source, nullable=False),
            sa.Column("source_id", sa.String(length=120), nullable=True),
            sa.Column("amount", sa.Integer(), nullable=False),
            sa.Column("status", jeton_status, nullable=False, server_default="posted"),
            sa.Column("related_ledger_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("jeton_ledger.id", ondelete="SET NULL"), nullable=True),
            sa.Column("idempotency_key", sa.String(length=200), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
            sa.UniqueConstraint("idempotency_key", name="uq_jeton_ledger_idempotency"),
        )
        op.create_index("ix_jeton_ledger_user_id", "jeton_ledger", ["user_id"])
        op.create_index("ix_jeton_ledger_created_at", "jeton_ledger", ["created_at"])

    if not insp.has_table("jeton_follow_rewards"):
        op.create_table(
            "jeton_follow_rewards",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("restaurant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=False),
            sa.Column("rewarded_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
            sa.UniqueConstraint("user_id", "restaurant_id", name="uq_jeton_follow_reward"),
        )
        op.create_index("ix_jeton_follow_rewards_user_id", "jeton_follow_rewards", ["user_id"])

    if not insp.has_table("referrals"):
        op.create_table(
            "referrals",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("referrer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("referred_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("device_hash", sa.String(length=128), nullable=True),
            sa.Column("ip_at_signup", sa.String(length=64), nullable=True),
            sa.Column("status", referral_status, nullable=False, server_default="pending"),
            sa.Column("rewarded_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
            sa.UniqueConstraint("referred_id", name="uq_referrals_referred_id"),
        )
        op.create_index("ix_referrals_referrer_id", "referrals", ["referrer_id"])

    if not insp.has_table("referral_attributions"):
        op.create_table(
            "referral_attributions",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("referrer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("device_hash", sa.String(length=128), nullable=False),
            sa.Column("clicked_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_referral_attributions_device_hash", "referral_attributions", ["device_hash"])
        op.create_index("ix_referral_attributions_expires_at", "referral_attributions", ["expires_at"])

    if not insp.has_table("jeton_daily_earn_totals"):
        op.create_table(
            "jeton_daily_earn_totals",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("earn_date", sa.Date(), nullable=False),
            sa.Column("total_earned", sa.Integer(), nullable=False, server_default="0"),
            sa.UniqueConstraint("user_id", "earn_date", name="uq_jeton_daily_earn"),
        )


def downgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)

    if insp.has_table("jeton_daily_earn_totals"):
        op.drop_table("jeton_daily_earn_totals")
    if insp.has_table("referral_attributions"):
        op.drop_table("referral_attributions")
    if insp.has_table("referrals"):
        op.drop_table("referrals")
    if insp.has_table("jeton_follow_rewards"):
        op.drop_table("jeton_follow_rewards")
    if insp.has_table("jeton_ledger"):
        op.drop_table("jeton_ledger")
    if insp.has_table("wallets"):
        op.drop_table("wallets")

    user_cols = {c["name"] for c in insp.get_columns("users")} if insp.has_table("users") else set()
    if "first_order_bonus_claimed" in user_cols:
        op.drop_column("users", "first_order_bonus_claimed")

    op.execute("DROP TYPE IF EXISTS referralstatus")
    op.execute("DROP TYPE IF EXISTS jetonledgerstatus")
    op.execute("DROP TYPE IF EXISTS jetonledgersource")
