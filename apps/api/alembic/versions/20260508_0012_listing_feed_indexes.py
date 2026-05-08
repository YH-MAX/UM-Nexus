"""Add composite listing feed indexes for query performance."""
from __future__ import annotations

from alembic import op


revision = "20260508_0012"
down_revision = "20260508_0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index("listings_status_moderation_idx", "listings", ["status", "moderation_status"])
    op.create_index("listings_category_status_idx", "listings", ["category", "status"])
    op.create_index("listings_created_at_idx", "listings", ["created_at"])
    op.create_index("listings_price_idx", "listings", ["price"])
    op.create_index("listings_pickup_location_idx", "listings", ["pickup_location"])


def downgrade() -> None:
    op.drop_index("listings_pickup_location_idx", table_name="listings")
    op.drop_index("listings_price_idx", table_name="listings")
    op.drop_index("listings_created_at_idx", table_name="listings")
    op.drop_index("listings_category_status_idx", table_name="listings")
    op.drop_index("listings_status_moderation_idx", table_name="listings")
