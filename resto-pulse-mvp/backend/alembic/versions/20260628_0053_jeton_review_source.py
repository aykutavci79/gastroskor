"""Jeton ledger — review source enum value

Revision ID: 20260628_0053
Revises: 20260627_0052
"""

from alembic import op

revision = "20260628_0053"
down_revision = "20260627_0052"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        DO $$ BEGIN
            ALTER TYPE jetonledgersource ADD VALUE 'review';
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
        """
    )


def downgrade() -> None:
    # PostgreSQL enum values cannot be removed safely; no-op.
    pass
