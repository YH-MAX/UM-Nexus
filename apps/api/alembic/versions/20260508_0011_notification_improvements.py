"""Add notification metadata, priority, actor, and indexes."""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260508_0011"
down_revision = "20260506_0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("notifications", sa.Column("actor_id", sa.Uuid(), nullable=True))
    op.add_column("notifications", sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column(
        "notifications",
        sa.Column("priority", sa.String(length=32), server_default="normal", nullable=False),
    )
    op.create_foreign_key(
        "fk_notifications_actor_id_users",
        "notifications",
        "users",
        ["actor_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("notifications_user_read_idx", "notifications", ["user_id", "is_read"])
    op.create_index("notifications_user_created_idx", "notifications", ["user_id", sa.text("created_at DESC")])
    op.create_index("notifications_entity_idx", "notifications", ["entity_type", "entity_id"])
    op.create_index(
        "notifications_dedupe_idx",
        "notifications",
        ["user_id", "type", "entity_type", "entity_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("notifications_dedupe_idx", table_name="notifications")
    op.drop_index("notifications_entity_idx", table_name="notifications")
    op.drop_index("notifications_user_created_idx", table_name="notifications")
    op.drop_index("notifications_user_read_idx", table_name="notifications")
    op.drop_constraint("fk_notifications_actor_id_users", "notifications", type_="foreignkey")
    op.drop_column("notifications", "priority")
    op.drop_column("notifications", "metadata")
    op.drop_column("notifications", "actor_id")
