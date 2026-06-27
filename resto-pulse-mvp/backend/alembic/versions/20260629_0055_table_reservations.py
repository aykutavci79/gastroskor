"""Online rezervasyon: floor plan + masa rezervasyonlari."""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20260629_0055"
down_revision = "20260628_0054"
branch_labels = None
depends_on = None

reservation_status = postgresql.ENUM(
    "pending_restaurant",
    "approved_by_restaurant",
    "confirmed",
    "rejected",
    "cancelled",
    "expired",
    name="restaurant_table_reservation_status",
    create_type=False,
)


def upgrade() -> None:
    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE restaurant_table_reservation_status AS ENUM (
                'pending_restaurant',
                'approved_by_restaurant',
                'confirmed',
                'rejected',
                'cancelled',
                'expired'
            );
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
        """
    )
    op.add_column(
        "restaurant_ownerships",
        sa.Column(
            "online_reservations_enabled",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
    )
    op.create_table(
        "restaurant_floor_plans",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("restaurant_id", sa.UUID(), nullable=False),
        sa.Column("draft_layout", sa.JSON(), nullable=True),
        sa.Column("published_layout", sa.JSON(), nullable=True),
        sa.Column("background_url", sa.String(length=1024), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["restaurant_id"], ["restaurants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("restaurant_id", name="uq_restaurant_floor_plans_restaurant"),
    )
    op.create_index("ix_restaurant_floor_plans_restaurant_id", "restaurant_floor_plans", ["restaurant_id"])

    op.create_table(
        "restaurant_table_reservations",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("restaurant_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("table_id", sa.String(length=64), nullable=False),
        sa.Column("table_label", sa.String(length=40), nullable=False),
        sa.Column("zone", sa.String(length=20), nullable=False),
        sa.Column("party_size", sa.Integer(), nullable=False),
        sa.Column("reserved_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("customer_phone", sa.String(length=32), nullable=False),
        sa.Column("customer_name", sa.String(length=120), nullable=True),
        sa.Column("status", reservation_status, nullable=False),
        sa.Column("reject_reason_text", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("restaurant_decided_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("customer_confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("customer_confirm_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["restaurant_id"], ["restaurants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_restaurant_table_reservations_restaurant_id",
        "restaurant_table_reservations",
        ["restaurant_id"],
    )
    op.create_index(
        "ix_restaurant_table_reservations_user_id",
        "restaurant_table_reservations",
        ["user_id"],
    )
    op.create_index(
        "ix_restaurant_table_reservations_status",
        "restaurant_table_reservations",
        ["status"],
    )
    op.create_index(
        "ix_restaurant_table_reservations_reserved_at",
        "restaurant_table_reservations",
        ["reserved_at"],
    )
    op.create_index(
        "ix_restaurant_table_reservations_table_slot",
        "restaurant_table_reservations",
        ["restaurant_id", "table_id", "reserved_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_restaurant_table_reservations_table_slot", table_name="restaurant_table_reservations")
    op.drop_index("ix_restaurant_table_reservations_reserved_at", table_name="restaurant_table_reservations")
    op.drop_index("ix_restaurant_table_reservations_status", table_name="restaurant_table_reservations")
    op.drop_index("ix_restaurant_table_reservations_user_id", table_name="restaurant_table_reservations")
    op.drop_index("ix_restaurant_table_reservations_restaurant_id", table_name="restaurant_table_reservations")
    op.drop_table("restaurant_table_reservations")
    op.drop_index("ix_restaurant_floor_plans_restaurant_id", table_name="restaurant_floor_plans")
    op.drop_table("restaurant_floor_plans")
    op.drop_column("restaurant_ownerships", "online_reservations_enabled")
    reservation_status.drop(op.get_bind(), checkfirst=True)
