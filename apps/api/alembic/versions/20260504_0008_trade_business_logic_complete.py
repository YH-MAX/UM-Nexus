"""Complete UM Nexus Trade business logic foundation."""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from uuid import uuid4


revision = "20260504_0008"
down_revision = "20260504_0007"
branch_labels = None
depends_on = None


CATEGORIES = (
    ("textbooks_notes", "Textbooks & Notes", 10),
    ("electronics", "Electronics", 20),
    ("dorm_room", "Dorm & Room", 30),
    ("kitchen_appliances", "Kitchen Appliances", 40),
    ("furniture", "Furniture", 50),
    ("clothing", "Clothing", 60),
    ("sports_hobby", "Sports & Hobby", 70),
    ("tickets_events", "Tickets & Events", 80),
    ("free_items", "Free Items", 90),
    ("others", "Others", 100),
)


def upgrade() -> None:
    op.add_column("profiles", sa.Column("display_name", sa.String(length=255), nullable=True))
    op.add_column("profiles", sa.Column("college_or_location", sa.String(length=255), nullable=True))
    op.add_column("profiles", sa.Column("contact_preference", sa.String(length=32), nullable=True))
    op.add_column("profiles", sa.Column("contact_value", sa.String(length=255), nullable=True))
    op.add_column(
        "profiles",
        sa.Column("verified_um_email", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.execute("UPDATE profiles SET display_name = full_name WHERE display_name IS NULL")
    op.execute("UPDATE profiles SET college_or_location = residential_college WHERE college_or_location IS NULL")

    op.add_column("listings", sa.Column("original_price", sa.Numeric(10, 2), nullable=True))
    op.add_column("listings", sa.Column("pickup_location", sa.String(length=64), nullable=True))
    op.add_column("listings", sa.Column("pickup_note", sa.String(length=500), nullable=True))
    op.add_column("listings", sa.Column("view_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("listings", sa.Column("hidden_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("listings", sa.Column("hidden_by", sa.Uuid(), nullable=True))
    op.add_column("listings", sa.Column("hidden_reason", sa.Text(), nullable=True))
    op.add_column("listings", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("listings", sa.Column("deleted_by", sa.Uuid(), nullable=True))
    op.add_column("listings", sa.Column("deleted_reason", sa.Text(), nullable=True))
    op.create_foreign_key("fk_listings_hidden_by_users", "listings", "users", ["hidden_by"], ["id"], ondelete="SET NULL")
    op.create_foreign_key("fk_listings_deleted_by_users", "listings", "users", ["deleted_by"], ["id"], ondelete="SET NULL")
    op.execute("UPDATE listings SET status = 'deleted' WHERE status = 'removed'")
    op.execute("UPDATE listings SET pickup_location = pickup_area WHERE pickup_location IS NULL")
    op.execute("UPDATE listings SET pickup_location = 'kk1' WHERE lower(pickup_location) = 'kk'")
    op.execute("UPDATE listings SET pickup_location = 'fsktm' WHERE lower(pickup_location) = 'fsktm'")
    op.execute("UPDATE listings SET pickup_location = 'main_library' WHERE lower(pickup_location) = 'library'")
    op.execute("UPDATE listings SET pickup_location = 'faculty_area' WHERE lower(pickup_location) = 'faculty_pickup'")
    op.execute("UPDATE listings SET pickup_location = 'other' WHERE pickup_location IS NULL")

    op.add_column("trade_contact_requests", sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("trade_contact_requests", sa.Column("expired_at", sa.DateTime(timezone=True), nullable=True))

    op.add_column("notifications", sa.Column("entity_type", sa.String(length=64), nullable=True))
    op.add_column("notifications", sa.Column("entity_id", sa.Uuid(), nullable=True))

    op.execute("UPDATE listing_reports SET status = 'pending' WHERE status = 'open'")
    op.execute("UPDATE listing_reports SET status = 'reviewed' WHERE status = 'resolved'")
    op.execute("UPDATE user_reports SET status = 'pending' WHERE status = 'open'")
    op.execute("UPDATE user_reports SET status = 'reviewed' WHERE status = 'resolved'")

    op.create_table(
        "listing_favorites",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("listing_id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["listing_id"], ["listings.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "listing_id", name="uq_listing_favorites_user_listing"),
    )
    op.create_index("ix_listing_favorites_listing_id", "listing_favorites", ["listing_id"])
    op.create_index("ix_listing_favorites_user_id", "listing_favorites", ["user_id"])

    op.create_table(
        "listing_views",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("listing_id", sa.Uuid(), nullable=False),
        sa.Column("viewer_user_id", sa.Uuid(), nullable=True),
        sa.Column("viewer_fingerprint", sa.String(length=128), nullable=False),
        sa.Column("viewed_on", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["listing_id"], ["listings.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["viewer_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("listing_id", "viewer_fingerprint", "viewed_on", name="uq_listing_views_daily_fingerprint"),
    )
    op.create_index("ix_listing_views_listing_id", "listing_views", ["listing_id"])
    op.create_index("ix_listing_views_viewer_user_id", "listing_views", ["viewer_user_id"])

    op.create_table(
        "admin_actions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("admin_id", sa.Uuid(), nullable=True),
        sa.Column("target_type", sa.String(length=64), nullable=False),
        sa.Column("target_id", sa.Uuid(), nullable=False),
        sa.Column("action_type", sa.String(length=64), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["admin_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_admin_actions_admin_id", "admin_actions", ["admin_id"])
    op.create_index("ix_admin_actions_target_id", "admin_actions", ["target_id"])
    op.create_index("ix_admin_actions_target_type", "admin_actions", ["target_type"])

    op.create_table(
        "ai_suggestions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("listing_id", sa.Uuid(), nullable=True),
        sa.Column("input_notes", sa.Text(), nullable=True),
        sa.Column("input_image_urls", sa.JSON(), nullable=True),
        sa.Column("suggested_title", sa.String(length=255), nullable=True),
        sa.Column("suggested_description", sa.Text(), nullable=True),
        sa.Column("suggested_category", sa.String(length=64), nullable=True),
        sa.Column("suggested_condition", sa.String(length=64), nullable=True),
        sa.Column("price_min", sa.Numeric(10, 2), nullable=True),
        sa.Column("price_max", sa.Numeric(10, 2), nullable=True),
        sa.Column("recommended_price", sa.Numeric(10, 2), nullable=True),
        sa.Column("risk_level", sa.String(length=32), nullable=True),
        sa.Column("risk_flags", sa.JSON(), nullable=True),
        sa.Column("raw_response", sa.JSON(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="generated"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["listing_id"], ["listings.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ai_suggestions_listing_id", "ai_suggestions", ["listing_id"])
    op.create_index("ix_ai_suggestions_user_id", "ai_suggestions", ["user_id"])

    op.create_table(
        "ai_usage_logs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=True),
        sa.Column("feature", sa.String(length=64), nullable=False),
        sa.Column("provider", sa.String(length=64), nullable=True),
        sa.Column("model", sa.String(length=128), nullable=True),
        sa.Column("request_status", sa.String(length=32), nullable=False),
        sa.Column("input_tokens", sa.Integer(), nullable=True),
        sa.Column("output_tokens", sa.Integer(), nullable=True),
        sa.Column("estimated_cost", sa.Numeric(12, 6), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ai_usage_logs_feature", "ai_usage_logs", ["feature"])
    op.create_index("ix_ai_usage_logs_user_id", "ai_usage_logs", ["user_id"])

    op.create_table(
        "trade_categories",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("slug", sa.String(length=64), nullable=False),
        sa.Column("label", sa.String(length=120), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index("ix_trade_categories_slug", "trade_categories", ["slug"])
    category_table = sa.table(
        "trade_categories",
        sa.column("id", sa.Uuid()),
        sa.column("slug", sa.String()),
        sa.column("label", sa.String()),
        sa.column("sort_order", sa.Integer()),
        sa.column("is_active", sa.Boolean()),
    )
    op.bulk_insert(
        category_table,
        [{"id": uuid4(), "slug": slug, "label": label, "sort_order": order, "is_active": True} for slug, label, order in CATEGORIES],
    )


def downgrade() -> None:
    op.drop_index("ix_trade_categories_slug", table_name="trade_categories")
    op.drop_table("trade_categories")

    op.drop_index("ix_ai_usage_logs_user_id", table_name="ai_usage_logs")
    op.drop_index("ix_ai_usage_logs_feature", table_name="ai_usage_logs")
    op.drop_table("ai_usage_logs")

    op.drop_index("ix_ai_suggestions_user_id", table_name="ai_suggestions")
    op.drop_index("ix_ai_suggestions_listing_id", table_name="ai_suggestions")
    op.drop_table("ai_suggestions")

    op.drop_index("ix_admin_actions_target_type", table_name="admin_actions")
    op.drop_index("ix_admin_actions_target_id", table_name="admin_actions")
    op.drop_index("ix_admin_actions_admin_id", table_name="admin_actions")
    op.drop_table("admin_actions")

    op.drop_index("ix_listing_views_viewer_user_id", table_name="listing_views")
    op.drop_index("ix_listing_views_listing_id", table_name="listing_views")
    op.drop_table("listing_views")

    op.drop_index("ix_listing_favorites_user_id", table_name="listing_favorites")
    op.drop_index("ix_listing_favorites_listing_id", table_name="listing_favorites")
    op.drop_table("listing_favorites")

    op.execute("UPDATE user_reports SET status = 'open' WHERE status = 'pending'")
    op.execute("UPDATE user_reports SET status = 'resolved' WHERE status = 'reviewed'")
    op.execute("UPDATE listing_reports SET status = 'open' WHERE status = 'pending'")
    op.execute("UPDATE listing_reports SET status = 'resolved' WHERE status = 'reviewed'")

    op.drop_column("notifications", "entity_id")
    op.drop_column("notifications", "entity_type")

    op.drop_column("trade_contact_requests", "expired_at")
    op.drop_column("trade_contact_requests", "cancelled_at")

    op.drop_constraint("fk_listings_deleted_by_users", "listings", type_="foreignkey")
    op.drop_constraint("fk_listings_hidden_by_users", "listings", type_="foreignkey")
    op.execute("UPDATE listings SET status = 'removed' WHERE status = 'deleted'")
    op.drop_column("listings", "deleted_reason")
    op.drop_column("listings", "deleted_by")
    op.drop_column("listings", "deleted_at")
    op.drop_column("listings", "hidden_reason")
    op.drop_column("listings", "hidden_by")
    op.drop_column("listings", "hidden_at")
    op.drop_column("listings", "view_count")
    op.drop_column("listings", "pickup_note")
    op.drop_column("listings", "pickup_location")
    op.drop_column("listings", "original_price")

    op.drop_column("profiles", "verified_um_email")
    op.drop_column("profiles", "contact_value")
    op.drop_column("profiles", "contact_preference")
    op.drop_column("profiles", "college_or_location")
    op.drop_column("profiles", "display_name")
