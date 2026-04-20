"""Add trade intelligence demo entities."""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260420_0002"
down_revision = "20260414_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "listings",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("seller_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("category", sa.String(length=64), nullable=False),
        sa.Column("item_name", sa.String(length=255), nullable=True),
        sa.Column("brand", sa.String(length=255), nullable=True),
        sa.Column("model", sa.String(length=255), nullable=True),
        sa.Column("condition_label", sa.String(length=64), nullable=True),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="MYR"),
        sa.Column("pickup_area", sa.String(length=64), nullable=True),
        sa.Column("residential_college", sa.String(length=255), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="active"),
        sa.Column("risk_score", sa.Numeric(5, 2), nullable=False, server_default="0"),
        sa.Column("is_ai_enriched", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["seller_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_listings_seller_id", "listings", ["seller_id"])
    op.create_index("ix_listings_category", "listings", ["category"])

    op.create_table(
        "wanted_posts",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("buyer_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("category", sa.String(length=64), nullable=False),
        sa.Column("desired_item_name", sa.String(length=255), nullable=True),
        sa.Column("max_budget", sa.Numeric(10, 2), nullable=True),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="MYR"),
        sa.Column("preferred_pickup_area", sa.String(length=64), nullable=True),
        sa.Column("residential_college", sa.String(length=255), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["buyer_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_wanted_posts_buyer_id", "wanted_posts", ["buyer_id"])
    op.create_index("ix_wanted_posts_category", "wanted_posts", ["category"])

    op.create_table(
        "listing_images",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("listing_id", sa.Uuid(), nullable=False),
        sa.Column("storage_path", sa.String(length=500), nullable=False),
        sa.Column("public_url", sa.String(length=500), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_primary", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["listing_id"], ["listings.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_listing_images_listing_id", "listing_images", ["listing_id"])

    op.create_table(
        "trade_matches",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("listing_id", sa.Uuid(), nullable=False),
        sa.Column("wanted_post_id", sa.Uuid(), nullable=False),
        sa.Column("match_score", sa.Numeric(5, 2), nullable=False),
        sa.Column("price_fit_score", sa.Numeric(5, 2), nullable=True),
        sa.Column("location_fit_score", sa.Numeric(5, 2), nullable=True),
        sa.Column("semantic_fit_score", sa.Numeric(5, 2), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="suggested"),
        sa.Column("explanation", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["listing_id"], ["listings.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["wanted_post_id"], ["wanted_posts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("listing_id", "wanted_post_id", name="uq_trade_matches_listing_wanted"),
    )
    op.create_index("ix_trade_matches_listing_id", "trade_matches", ["listing_id"])
    op.create_index("ix_trade_matches_wanted_post_id", "trade_matches", ["wanted_post_id"])

    op.create_table(
        "agent_runs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("agent_name", sa.String(length=100), nullable=False),
        sa.Column("entity_type", sa.String(length=100), nullable=False),
        sa.Column("entity_id", sa.Uuid(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("input_payload", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_agent_runs_entity_id", "agent_runs", ["entity_id"])

    op.create_table(
        "agent_outputs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("agent_run_id", sa.Uuid(), nullable=False),
        sa.Column("output_type", sa.String(length=100), nullable=False),
        sa.Column("content", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["agent_run_id"], ["agent_runs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_agent_outputs_agent_run_id", "agent_outputs", ["agent_run_id"])


def downgrade() -> None:
    op.drop_index("ix_agent_outputs_agent_run_id", table_name="agent_outputs")
    op.drop_table("agent_outputs")
    op.drop_index("ix_agent_runs_entity_id", table_name="agent_runs")
    op.drop_table("agent_runs")
    op.drop_index("ix_trade_matches_wanted_post_id", table_name="trade_matches")
    op.drop_index("ix_trade_matches_listing_id", table_name="trade_matches")
    op.drop_table("trade_matches")
    op.drop_index("ix_listing_images_listing_id", table_name="listing_images")
    op.drop_table("listing_images")
    op.drop_index("ix_wanted_posts_category", table_name="wanted_posts")
    op.drop_index("ix_wanted_posts_buyer_id", table_name="wanted_posts")
    op.drop_table("wanted_posts")
    op.drop_index("ix_listings_category", table_name="listings")
    op.drop_index("ix_listings_seller_id", table_name="listings")
    op.drop_table("listings")
