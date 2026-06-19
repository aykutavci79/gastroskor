"""Kelime Sofrasi anonim deneme loglari ve aday kelimeler

Revision ID: 20260625_0048
Revises: 20260624_0047
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql

revision = "20260625_0048"
down_revision = "20260624_0047"
branch_labels = None
depends_on = None

aday_status = postgresql.ENUM(
    "pending",
    "approved",
    "rejected",
    name="sofra_kelime_aday_status",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)

    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE sofra_kelime_aday_status AS ENUM ('pending', 'approved', 'rejected');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        """
    )

    if not insp.has_table("sofra_wheel_attempts"):
        op.create_table(
            "sofra_wheel_attempts",
            sa.Column("kelime", sa.String(length=32), primary_key=True),
            sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="1"),
            sa.Column(
                "first_seen_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("now()"),
            ),
            sa.Column(
                "last_seen_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("now()"),
            ),
        )
        op.create_index(
            "ix_sofra_wheel_attempts_count",
            "sofra_wheel_attempts",
            ["attempt_count"],
        )

    if not insp.has_table("sofra_kelime_adaylari"):
        op.create_table(
            "sofra_kelime_adaylari",
            sa.Column("kelime", sa.String(length=32), primary_key=True),
            sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("tdk_valid", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("tdk_anlam_kisa", sa.Text(), nullable=True),
            sa.Column(
                "status",
                aday_status,
                nullable=False,
                server_default="pending",
            ),
            sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("now()"),
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("now()"),
            ),
        )
        op.create_index(
            "ix_sofra_kelime_adaylari_status_count",
            "sofra_kelime_adaylari",
            ["status", "attempt_count"],
        )


def downgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    if insp.has_table("sofra_kelime_adaylari"):
        op.drop_table("sofra_kelime_adaylari")
    if insp.has_table("sofra_wheel_attempts"):
        op.drop_table("sofra_wheel_attempts")
    op.execute("DROP TYPE IF EXISTS sofra_kelime_aday_status")
