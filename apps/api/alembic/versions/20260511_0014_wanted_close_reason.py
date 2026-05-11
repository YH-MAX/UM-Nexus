"""Add close reason fields to wanted posts."""

from alembic import op
import sqlalchemy as sa


revision = "20260511_0014"
down_revision = "20260510_0013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("wanted_posts", sa.Column("closed_reason", sa.String(length=64), nullable=True))
    op.add_column("wanted_posts", sa.Column("closed_reason_note", sa.Text(), nullable=True))
    op.add_column("wanted_posts", sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("wanted_posts", "closed_at")
    op.drop_column("wanted_posts", "closed_reason_note")
    op.drop_column("wanted_posts", "closed_reason")
