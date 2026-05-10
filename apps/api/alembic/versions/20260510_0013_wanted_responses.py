"""Add wanted post response workflow."""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision = "20260510_0013"
down_revision = "20260508_0012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "wanted_responses",
        sa.Column("wanted_post_id", sa.Uuid(), nullable=False),
        sa.Column("seller_id", sa.Uuid(), nullable=False),
        sa.Column("buyer_id", sa.Uuid(), nullable=False),
        sa.Column("listing_id", sa.Uuid(), nullable=True),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("seller_contact_method", sa.String(length=32), nullable=False),
        sa.Column("seller_contact_value", sa.String(length=255), nullable=True),
        sa.Column("status", sa.String(length=32), server_default="pending", nullable=False),
        sa.Column("buyer_response", sa.Text(), nullable=True),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("rejected_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["buyer_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["listing_id"], ["listings.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["seller_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["wanted_post_id"], ["wanted_posts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("wanted_responses_wanted_post_id_idx", "wanted_responses", ["wanted_post_id"])
    op.create_index("wanted_responses_seller_id_idx", "wanted_responses", ["seller_id"])
    op.create_index("wanted_responses_buyer_id_idx", "wanted_responses", ["buyer_id"])
    op.create_index("wanted_responses_listing_id_idx", "wanted_responses", ["listing_id"])
    op.create_index("wanted_responses_status_idx", "wanted_responses", ["status"])
    op.create_index("wanted_posts_status_created_at_idx", "wanted_posts", ["status", "created_at"])


def downgrade() -> None:
    op.drop_index("wanted_posts_status_created_at_idx", table_name="wanted_posts")
    op.drop_index("wanted_responses_status_idx", table_name="wanted_responses")
    op.drop_index("wanted_responses_listing_id_idx", table_name="wanted_responses")
    op.drop_index("wanted_responses_buyer_id_idx", table_name="wanted_responses")
    op.drop_index("wanted_responses_seller_id_idx", table_name="wanted_responses")
    op.drop_index("wanted_responses_wanted_post_id_idx", table_name="wanted_responses")
    op.drop_table("wanted_responses")
