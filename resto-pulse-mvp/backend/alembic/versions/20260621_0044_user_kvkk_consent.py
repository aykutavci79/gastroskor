"""User KVKK consent fields

Revision ID: 20260621_0044
Revises: 20260620_0043
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "20260621_0044"
down_revision = "20260620_0043"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    cols = {col["name"] for col in insp.get_columns("users")}
    if "kvkk_consent_at" not in cols:
        op.add_column("users", sa.Column("kvkk_consent_at", sa.DateTime(timezone=True), nullable=True))
    if "kvkk_consent_version" not in cols:
        op.add_column("users", sa.Column("kvkk_consent_version", sa.String(length=32), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    cols = {col["name"] for col in insp.get_columns("users")}
    if "kvkk_consent_version" in cols:
        op.drop_column("users", "kvkk_consent_version")
    if "kvkk_consent_at" in cols:
        op.drop_column("users", "kvkk_consent_at")
