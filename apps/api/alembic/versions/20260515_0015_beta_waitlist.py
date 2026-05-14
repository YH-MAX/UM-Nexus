"""Add beta waitlist table."""

from alembic import op
import sqlalchemy as sa


revision = "20260515_0015"
down_revision = "20260511_0014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "beta_waitlist",
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_beta_waitlist_email"), "beta_waitlist", ["email"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_beta_waitlist_email"), table_name="beta_waitlist")
    op.drop_table("beta_waitlist")
