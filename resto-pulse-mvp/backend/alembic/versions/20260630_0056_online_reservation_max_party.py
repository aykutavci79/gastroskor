"""online_reservation_max_party_size on restaurant_ownerships."""

from alembic import op
import sqlalchemy as sa

revision = "20260630_0056"
down_revision = "20260629_0055"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "restaurant_ownerships",
        sa.Column(
            "online_reservation_max_party_size",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("10"),
        ),
    )


def downgrade() -> None:
    op.drop_column("restaurant_ownerships", "online_reservation_max_party_size")
