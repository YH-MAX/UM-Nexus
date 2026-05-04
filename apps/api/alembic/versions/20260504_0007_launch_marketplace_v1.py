"""Launch marketplace V1 trust and contact flows."""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260504_0007"
down_revision = "20260421_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("listings", sa.Column("contact_method", sa.String(length=32), nullable=True))
    op.add_column("listings", sa.Column("contact_value", sa.String(length=255), nullable=True))
    op.alter_column("listings", "status", server_default="available")

    op.execute("UPDATE listings SET status = 'available' WHERE status = 'active'")
    op.execute("UPDATE listings SET status = 'sold' WHERE status IN ('closed', 'completed')")
    op.execute("UPDATE listings SET category = 'textbooks_notes' WHERE category = 'textbooks'")
    op.execute("UPDATE listings SET category = 'kitchen_appliances' WHERE category = 'small_appliances'")
    op.execute("UPDATE listings SET category = 'dorm_room' WHERE category = 'dorm_essentials'")

    for table_name in ("wanted_posts", "historical_sales", "benchmark_cases"):
        op.execute(f"UPDATE {table_name} SET category = 'textbooks_notes' WHERE category = 'textbooks'")
        op.execute(f"UPDATE {table_name} SET category = 'kitchen_appliances' WHERE category = 'small_appliances'")
        op.execute(f"UPDATE {table_name} SET category = 'dorm_room' WHERE category = 'dorm_essentials'")

    op.create_table(
        "trade_contact_requests",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("listing_id", sa.Uuid(), nullable=False),
        sa.Column("buyer_id", sa.Uuid(), nullable=False),
        sa.Column("seller_id", sa.Uuid(), nullable=False),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("buyer_contact_method", sa.String(length=32), nullable=False),
        sa.Column("buyer_contact_value", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("seller_response", sa.Text(), nullable=True),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("rejected_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["buyer_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["listing_id"], ["listings.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["seller_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_trade_contact_requests_listing_id", "trade_contact_requests", ["listing_id"])
    op.create_index("ix_trade_contact_requests_buyer_id", "trade_contact_requests", ["buyer_id"])
    op.create_index("ix_trade_contact_requests_seller_id", "trade_contact_requests", ["seller_id"])

    op.create_table(
        "user_reports",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("reported_user_id", sa.Uuid(), nullable=False),
        sa.Column("reporter_user_id", sa.Uuid(), nullable=True),
        sa.Column("report_type", sa.String(length=100), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="open"),
        sa.Column("moderator_user_id", sa.Uuid(), nullable=True),
        sa.Column("resolution", sa.Text(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["moderator_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["reported_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["reporter_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_user_reports_reported_user_id", "user_reports", ["reported_user_id"])
    op.create_index("ix_user_reports_reporter_user_id", "user_reports", ["reporter_user_id"])
    op.create_index("ix_user_reports_moderator_user_id", "user_reports", ["moderator_user_id"])


def downgrade() -> None:
    op.drop_index("ix_user_reports_moderator_user_id", table_name="user_reports")
    op.drop_index("ix_user_reports_reporter_user_id", table_name="user_reports")
    op.drop_index("ix_user_reports_reported_user_id", table_name="user_reports")
    op.drop_table("user_reports")

    op.drop_index("ix_trade_contact_requests_seller_id", table_name="trade_contact_requests")
    op.drop_index("ix_trade_contact_requests_buyer_id", table_name="trade_contact_requests")
    op.drop_index("ix_trade_contact_requests_listing_id", table_name="trade_contact_requests")
    op.drop_table("trade_contact_requests")

    for table_name in ("wanted_posts", "historical_sales", "benchmark_cases"):
        op.execute(f"UPDATE {table_name} SET category = 'textbooks' WHERE category = 'textbooks_notes'")
        op.execute(f"UPDATE {table_name} SET category = 'small_appliances' WHERE category = 'kitchen_appliances'")
        op.execute(f"UPDATE {table_name} SET category = 'dorm_essentials' WHERE category = 'dorm_room'")

    op.execute("UPDATE listings SET category = 'textbooks' WHERE category = 'textbooks_notes'")
    op.execute("UPDATE listings SET category = 'small_appliances' WHERE category = 'kitchen_appliances'")
    op.execute("UPDATE listings SET category = 'dorm_essentials' WHERE category = 'dorm_room'")
    op.execute("UPDATE listings SET status = 'active' WHERE status = 'available'")
    op.execute("UPDATE listings SET status = 'closed' WHERE status = 'sold'")
    op.alter_column("listings", "status", server_default="active")

    op.drop_column("listings", "contact_value")
    op.drop_column("listings", "contact_method")
