"""restaurant_ownerships — rezervasyon vitrin onay durumu."""

from alembic import op
import sqlalchemy as sa

revision = "20260701_0058"
down_revision = "20260630_0057"
branch_labels = None
depends_on = None

VITRIN_STATUS = sa.Enum(
    "disabled",
    "pending",
    "approved",
    "rejected",
    "suspended",
    name="reservation_vitrin_status",
)


def upgrade() -> None:
    VITRIN_STATUS.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "restaurant_ownerships",
        sa.Column(
            "reservation_vitrin_status",
            VITRIN_STATUS,
            nullable=False,
            server_default="disabled",
        ),
    )
    op.add_column(
        "restaurant_ownerships",
        sa.Column("reservation_vitrin_applied_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "restaurant_ownerships",
        sa.Column("reservation_vitrin_decided_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "restaurant_ownerships",
        sa.Column("reservation_vitrin_decided_by", sa.String(255), nullable=True),
    )
    op.add_column(
        "restaurant_ownerships",
        sa.Column("reservation_vitrin_reject_reason", sa.Text(), nullable=True),
    )
    op.create_index(
        "ix_restaurant_ownerships_reservation_vitrin_status",
        "restaurant_ownerships",
        ["reservation_vitrin_status"],
    )
    op.execute(
        """
        UPDATE restaurant_ownerships
        SET reservation_vitrin_status = 'pending'
        WHERE online_reservations_enabled = true
          AND reservation_vitrin_status = 'disabled'
          AND google_place_id NOT LIKE 'gastro-tester-%'
        """
    )
    op.execute(
        """
        UPDATE restaurant_ownerships
        SET reservation_vitrin_status = 'approved'
        WHERE google_place_id LIKE 'gastro-tester-deneme-2'
        """
    )


def downgrade() -> None:
    op.drop_index("ix_restaurant_ownerships_reservation_vitrin_status", table_name="restaurant_ownerships")
    op.drop_column("restaurant_ownerships", "reservation_vitrin_reject_reason")
    op.drop_column("restaurant_ownerships", "reservation_vitrin_decided_by")
    op.drop_column("restaurant_ownerships", "reservation_vitrin_decided_at")
    op.drop_column("restaurant_ownerships", "reservation_vitrin_applied_at")
    op.drop_column("restaurant_ownerships", "reservation_vitrin_status")
    VITRIN_STATUS.drop(op.get_bind(), checkfirst=True)
