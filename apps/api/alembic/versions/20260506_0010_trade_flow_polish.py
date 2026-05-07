"""Polish UM Nexus Trade user flow business rules."""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260506_0010"
down_revision = "20260505_0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("profiles", sa.Column("trade_safety_acknowledged_at", sa.DateTime(timezone=True), nullable=True))

    op.add_column("listings", sa.Column("source_wanted_post_id", sa.Uuid(), nullable=True))
    op.add_column("listings", sa.Column("sold_source", sa.String(length=64), nullable=True))
    op.add_column("listings", sa.Column("sold_contact_request_id", sa.Uuid(), nullable=True))
    op.create_foreign_key(
        "fk_listings_source_wanted_post_id_wanted_posts",
        "listings",
        "wanted_posts",
        ["source_wanted_post_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_listings_sold_contact_request_id_trade_contact_requests",
        "listings",
        "trade_contact_requests",
        ["sold_contact_request_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_listings_source_wanted_post_id", "listings", ["source_wanted_post_id"])
    op.create_index("ix_listings_sold_contact_request_id", "listings", ["sold_contact_request_id"])

    op.add_column("trade_transactions", sa.Column("contact_request_id", sa.Uuid(), nullable=True))
    op.add_column("trade_transactions", sa.Column("sale_source", sa.String(length=64), nullable=True))
    op.create_foreign_key(
        "fk_trade_transactions_contact_request_id_trade_contact_requests",
        "trade_transactions",
        "trade_contact_requests",
        ["contact_request_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_trade_transactions_contact_request_id", "trade_transactions", ["contact_request_id"])

    op.alter_column("trade_contact_requests", "buyer_contact_value", existing_type=sa.String(length=255), nullable=True)

    op.execute(
        "UPDATE listings SET contact_method = 'in_app' "
        "WHERE contact_method IS NULL AND status IN ('available', 'reserved')"
    )
    op.execute("UPDATE listings SET moderation_status = 'clear' WHERE moderation_status = 'approved'")
    op.execute("UPDATE listings SET moderation_status = 'review_required' WHERE moderation_status = 'pending'")


def downgrade() -> None:
    op.execute("UPDATE listings SET moderation_status = 'approved' WHERE moderation_status IN ('clear', 'flagged')")

    op.alter_column("trade_contact_requests", "buyer_contact_value", existing_type=sa.String(length=255), nullable=False)

    op.drop_index("ix_trade_transactions_contact_request_id", table_name="trade_transactions")
    op.drop_constraint(
        "fk_trade_transactions_contact_request_id_trade_contact_requests",
        "trade_transactions",
        type_="foreignkey",
    )
    op.drop_column("trade_transactions", "sale_source")
    op.drop_column("trade_transactions", "contact_request_id")

    op.drop_index("ix_listings_sold_contact_request_id", table_name="listings")
    op.drop_index("ix_listings_source_wanted_post_id", table_name="listings")
    op.drop_constraint(
        "fk_listings_sold_contact_request_id_trade_contact_requests",
        "listings",
        type_="foreignkey",
    )
    op.drop_constraint("fk_listings_source_wanted_post_id_wanted_posts", "listings", type_="foreignkey")
    op.drop_column("listings", "sold_contact_request_id")
    op.drop_column("listings", "sold_source")
    op.drop_column("listings", "source_wanted_post_id")

    op.drop_column("profiles", "trade_safety_acknowledged_at")
