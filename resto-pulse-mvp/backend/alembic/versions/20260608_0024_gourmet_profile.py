"""Gurme Sohbetler — nickname ve avatar preset

Revision ID: 20260608_0024
Revises: 20260607_0023
"""

from alembic import op
import sqlalchemy as sa

revision = "20260608_0024"
down_revision = "20260607_0023"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("nickname", sa.String(length=32), nullable=True))
    op.add_column("users", sa.Column("avatar_preset", sa.String(length=32), nullable=True))
    op.create_index(
        "ix_users_nickname_lower",
        "users",
        [sa.text("lower(nickname)")],
        unique=True,
        postgresql_where=sa.text("nickname IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("ix_users_nickname_lower", table_name="users")
    op.drop_column("users", "avatar_preset")
    op.drop_column("users", "nickname")
