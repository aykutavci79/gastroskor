"""users.apple_sub for Sign in with Apple"""

from alembic import op
import sqlalchemy as sa

revision = "20260702_0060"
down_revision = "20260701_0059"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("apple_sub", sa.String(length=255), nullable=True))
    op.create_index("ix_users_apple_sub", "users", ["apple_sub"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_users_apple_sub", table_name="users")
    op.drop_column("users", "apple_sub")
