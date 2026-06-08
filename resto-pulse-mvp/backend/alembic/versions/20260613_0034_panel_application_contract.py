"""Isletme basvuru formu ve sozlesme alanlari

Revision ID: 20260613_0034
Revises: 20260613_0033
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260613_0034"
down_revision = "20260613_0033"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "restaurant_panel_applications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("business_name", sa.String(length=200), nullable=False),
        sa.Column("contact_name", sa.String(length=120), nullable=False),
        sa.Column("panel_email", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=32), nullable=False),
        sa.Column("address", sa.Text(), nullable=False),
        sa.Column("city", sa.String(length=80), nullable=False, server_default="Bursa"),
        sa.Column("website", sa.String(length=500), nullable=True),
        sa.Column("google_place_id", sa.String(length=255), nullable=True),
        sa.Column("google_place_name", sa.String(length=255), nullable=True),
        sa.Column("tax_document_key", sa.String(length=512), nullable=False),
        sa.Column("tax_document_content_type", sa.String(length=80), nullable=False),
        sa.Column("contract_version", sa.String(length=40), nullable=False),
        sa.Column("contract_accepted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("contract_postal_promised", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("applicant_notes", sa.Text(), nullable=True),
        sa.Column("admin_notes", sa.Text(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reviewed_by_email", sa.String(length=255), nullable=True),
        sa.Column("ownership_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["ownership_id"], ["restaurant_ownerships.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_panel_applications_panel_email", "restaurant_panel_applications", ["panel_email"])
    op.create_index("ix_panel_applications_status", "restaurant_panel_applications", ["status"])
    op.create_index("ix_panel_applications_created_at", "restaurant_panel_applications", ["created_at"])

    op.add_column(
        "restaurant_ownerships",
        sa.Column("contract_required", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column(
        "restaurant_ownerships",
        sa.Column("contract_electronic_accepted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "restaurant_ownerships",
        sa.Column("contract_signed_received_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "restaurant_ownerships",
        sa.Column("panel_application_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_ownership_panel_application",
        "restaurant_ownerships",
        "restaurant_panel_applications",
        ["panel_application_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_ownership_panel_application", "restaurant_ownerships", type_="foreignkey")
    op.drop_column("restaurant_ownerships", "panel_application_id")
    op.drop_column("restaurant_ownerships", "contract_signed_received_at")
    op.drop_column("restaurant_ownerships", "contract_electronic_accepted_at")
    op.drop_column("restaurant_ownerships", "contract_required")
    op.drop_table("restaurant_panel_applications")
