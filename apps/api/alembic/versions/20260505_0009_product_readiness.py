"""Add product readiness analytics events."""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260505_0009"
down_revision = "20260504_0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "product_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=True),
        sa.Column("event_type", sa.String(length=100), nullable=False),
        sa.Column("entity_type", sa.String(length=64), nullable=True),
        sa.Column("entity_id", sa.Uuid(), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_product_events_created_at", "product_events", ["created_at"])
    op.create_index("ix_product_events_entity_id", "product_events", ["entity_id"])
    op.create_index("ix_product_events_entity_type", "product_events", ["entity_type"])
    op.create_index("ix_product_events_event_type", "product_events", ["event_type"])
    op.create_index("ix_product_events_user_id", "product_events", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_product_events_user_id", table_name="product_events")
    op.drop_index("ix_product_events_event_type", table_name="product_events")
    op.drop_index("ix_product_events_entity_type", table_name="product_events")
    op.drop_index("ix_product_events_entity_id", table_name="product_events")
    op.drop_index("ix_product_events_created_at", table_name="product_events")
    op.drop_table("product_events")
