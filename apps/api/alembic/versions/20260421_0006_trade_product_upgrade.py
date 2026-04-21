"""Upgrade trade intelligence to product workflows."""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260421_0006"
down_revision = "20260421_0005"
branch_labels = None
depends_on = None


def _json_type():
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        return postgresql.JSONB(astext_type=sa.Text())
    return sa.JSON()


def upgrade() -> None:
    json_type = _json_type()

    op.add_column("listings", sa.Column("risk_evidence", json_type, nullable=True))
    op.add_column(
        "listings",
        sa.Column("moderation_status", sa.String(length=32), nullable=False, server_default="approved"),
    )
    op.add_column("listings", sa.Column("accepted_recommended_price", sa.Numeric(10, 2), nullable=True))
    op.add_column("listings", sa.Column("recommendation_applied_at", sa.DateTime(timezone=True), nullable=True))

    op.add_column("listing_images", sa.Column("content_hash", sa.String(length=128), nullable=True))
    op.create_index("ix_listing_images_content_hash", "listing_images", ["content_hash"])

    op.add_column("listing_reports", sa.Column("reporter_user_id", sa.Uuid(), nullable=True))
    op.add_column("listing_reports", sa.Column("status", sa.String(length=32), nullable=False, server_default="open"))
    op.add_column("listing_reports", sa.Column("moderator_user_id", sa.Uuid(), nullable=True))
    op.add_column("listing_reports", sa.Column("resolution", sa.Text(), nullable=True))
    op.add_column("listing_reports", sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_listing_reports_reporter_user_id", "listing_reports", ["reporter_user_id"])
    op.create_index("ix_listing_reports_moderator_user_id", "listing_reports", ["moderator_user_id"])
    op.create_foreign_key(
        "fk_listing_reports_reporter_user_id_users",
        "listing_reports",
        "users",
        ["reporter_user_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_listing_reports_moderator_user_id_users",
        "listing_reports",
        "users",
        ["moderator_user_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.add_column("trade_matches", sa.Column("contacted_by_user_id", sa.Uuid(), nullable=True))
    op.add_column("trade_matches", sa.Column("contacted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("trade_matches", sa.Column("contact_message", sa.Text(), nullable=True))
    op.create_index("ix_trade_matches_contacted_by_user_id", "trade_matches", ["contacted_by_user_id"])
    op.create_foreign_key(
        "fk_trade_matches_contacted_by_user_id_users",
        "trade_matches",
        "users",
        ["contacted_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_table(
        "trade_transactions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("listing_id", sa.Uuid(), nullable=False),
        sa.Column("trade_match_id", sa.Uuid(), nullable=True),
        sa.Column("seller_id", sa.Uuid(), nullable=False),
        sa.Column("buyer_id", sa.Uuid(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="contacted"),
        sa.Column("agreed_price", sa.Numeric(10, 2), nullable=True),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="MYR"),
        sa.Column("seller_feedback", sa.Text(), nullable=True),
        sa.Column("buyer_feedback", sa.Text(), nullable=True),
        sa.Column("followed_ai_recommendation", sa.Boolean(), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["buyer_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["listing_id"], ["listings.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["seller_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["trade_match_id"], ["trade_matches.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_trade_transactions_listing_id", "trade_transactions", ["listing_id"])
    op.create_index("ix_trade_transactions_trade_match_id", "trade_transactions", ["trade_match_id"])
    op.create_index("ix_trade_transactions_seller_id", "trade_transactions", ["seller_id"])
    op.create_index("ix_trade_transactions_buyer_id", "trade_transactions", ["buyer_id"])

    op.create_table(
        "trade_decision_feedback",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("listing_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("feedback_type", sa.String(length=64), nullable=False),
        sa.Column("suggested_listing_price", sa.Numeric(10, 2), nullable=True),
        sa.Column("applied_price", sa.Numeric(10, 2), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["listing_id"], ["listings.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_trade_decision_feedback_listing_id", "trade_decision_feedback", ["listing_id"])
    op.create_index("ix_trade_decision_feedback_user_id", "trade_decision_feedback", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_trade_decision_feedback_user_id", table_name="trade_decision_feedback")
    op.drop_index("ix_trade_decision_feedback_listing_id", table_name="trade_decision_feedback")
    op.drop_table("trade_decision_feedback")

    op.drop_index("ix_trade_transactions_buyer_id", table_name="trade_transactions")
    op.drop_index("ix_trade_transactions_seller_id", table_name="trade_transactions")
    op.drop_index("ix_trade_transactions_trade_match_id", table_name="trade_transactions")
    op.drop_index("ix_trade_transactions_listing_id", table_name="trade_transactions")
    op.drop_table("trade_transactions")

    op.drop_constraint("fk_trade_matches_contacted_by_user_id_users", "trade_matches", type_="foreignkey")
    op.drop_index("ix_trade_matches_contacted_by_user_id", table_name="trade_matches")
    op.drop_column("trade_matches", "contact_message")
    op.drop_column("trade_matches", "contacted_at")
    op.drop_column("trade_matches", "contacted_by_user_id")

    op.drop_constraint("fk_listing_reports_moderator_user_id_users", "listing_reports", type_="foreignkey")
    op.drop_constraint("fk_listing_reports_reporter_user_id_users", "listing_reports", type_="foreignkey")
    op.drop_index("ix_listing_reports_moderator_user_id", table_name="listing_reports")
    op.drop_index("ix_listing_reports_reporter_user_id", table_name="listing_reports")
    op.drop_column("listing_reports", "reviewed_at")
    op.drop_column("listing_reports", "resolution")
    op.drop_column("listing_reports", "moderator_user_id")
    op.drop_column("listing_reports", "status")
    op.drop_column("listing_reports", "reporter_user_id")

    op.drop_index("ix_listing_images_content_hash", table_name="listing_images")
    op.drop_column("listing_images", "content_hash")

    op.drop_column("listings", "recommendation_applied_at")
    op.drop_column("listings", "accepted_recommended_price")
    op.drop_column("listings", "moderation_status")
    op.drop_column("listings", "risk_evidence")
