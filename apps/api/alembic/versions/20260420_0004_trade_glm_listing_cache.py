"""Add GLM decision cache fields to listings."""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260420_0004"
down_revision = "20260420_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("listings", sa.Column("risk_level", sa.String(length=32), nullable=True))
    op.add_column("listings", sa.Column("suggested_listing_price", sa.Numeric(10, 2), nullable=True))
    op.add_column("listings", sa.Column("minimum_acceptable_price", sa.Numeric(10, 2), nullable=True))
    op.add_column("listings", sa.Column("ai_explanation_cache", postgresql.JSONB(astext_type=sa.Text()), nullable=True))


def downgrade() -> None:
    op.drop_column("listings", "ai_explanation_cache")
    op.drop_column("listings", "minimum_acceptable_price")
    op.drop_column("listings", "suggested_listing_price")
    op.drop_column("listings", "risk_level")
