"""Add historical intelligence entities."""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260420_0003"
down_revision = "20260420_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "historical_sales",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("item_name", sa.String(length=255), nullable=False),
        sa.Column("category", sa.String(length=64), nullable=False),
        sa.Column("condition_label", sa.String(length=64), nullable=True),
        sa.Column("sold_price", sa.Numeric(10, 2), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="MYR"),
        sa.Column("location", sa.String(length=64), nullable=True),
        sa.Column("residential_college", sa.String(length=255), nullable=True),
        sa.Column("sold_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("source_type", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_historical_sales_item_name", "historical_sales", ["item_name"])
    op.create_index("ix_historical_sales_category", "historical_sales", ["category"])

    op.create_table(
        "listing_reports",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("listing_id", sa.Uuid(), nullable=False),
        sa.Column("report_type", sa.String(length=100), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["listing_id"], ["listings.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_listing_reports_listing_id", "listing_reports", ["listing_id"])

    op.create_table(
        "listing_embeddings",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("listing_id", sa.Uuid(), nullable=False),
        sa.Column("embedding", sa.Text(), nullable=True),
        sa.Column("model_name", sa.String(length=100), nullable=True),
        sa.Column("source_text", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["listing_id"], ["listings.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("listing_id"),
    )
    op.execute("alter table listing_embeddings alter column embedding type vector(1536) using embedding::vector;")
    op.create_index("ix_listing_embeddings_listing_id", "listing_embeddings", ["listing_id"])

    op.create_table(
        "wanted_post_embeddings",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("wanted_post_id", sa.Uuid(), nullable=False),
        sa.Column("embedding", sa.Text(), nullable=True),
        sa.Column("model_name", sa.String(length=100), nullable=True),
        sa.Column("source_text", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["wanted_post_id"], ["wanted_posts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("wanted_post_id"),
    )
    op.execute("alter table wanted_post_embeddings alter column embedding type vector(1536) using embedding::vector;")
    op.create_index("ix_wanted_post_embeddings_wanted_post_id", "wanted_post_embeddings", ["wanted_post_id"])


def downgrade() -> None:
    op.drop_index("ix_wanted_post_embeddings_wanted_post_id", table_name="wanted_post_embeddings")
    op.drop_table("wanted_post_embeddings")
    op.drop_index("ix_listing_embeddings_listing_id", table_name="listing_embeddings")
    op.drop_table("listing_embeddings")
    op.drop_index("ix_listing_reports_listing_id", table_name="listing_reports")
    op.drop_table("listing_reports")
    op.drop_index("ix_historical_sales_category", table_name="historical_sales")
    op.drop_index("ix_historical_sales_item_name", table_name="historical_sales")
    op.drop_table("historical_sales")
