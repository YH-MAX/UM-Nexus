"""Add trade benchmark evaluation entities."""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260421_0005"
down_revision = "20260420_0004"
branch_labels = None
depends_on = None


def _json_type():
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        return postgresql.JSONB(astext_type=sa.Text())
    return sa.JSON()


def upgrade() -> None:
    json_type = _json_type()

    op.create_table(
        "benchmark_cases",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("category", sa.String(length=64), nullable=False),
        sa.Column("listing_title", sa.String(length=255), nullable=False),
        sa.Column("listing_description", sa.Text(), nullable=True),
        sa.Column("condition_label", sa.String(length=64), nullable=True),
        sa.Column("pickup_area", sa.String(length=64), nullable=True),
        sa.Column("residential_college", sa.String(length=255), nullable=True),
        sa.Column("image_urls", json_type, nullable=True),
        sa.Column("expected_price_min", sa.Numeric(10, 2), nullable=True),
        sa.Column("expected_price_max", sa.Numeric(10, 2), nullable=True),
        sa.Column("expected_risk_level", sa.String(length=32), nullable=True),
        sa.Column("expected_action_type", sa.String(length=64), nullable=True),
        sa.Column("expected_best_match_count", sa.Integer(), nullable=True),
        sa.Column("expected_best_match_ids", json_type, nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_benchmark_cases_category", "benchmark_cases", ["category"])

    op.create_table(
        "benchmark_runs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("benchmark_case_id", sa.Uuid(), nullable=False),
        sa.Column("model_name", sa.String(length=100), nullable=False),
        sa.Column("run_status", sa.String(length=32), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["benchmark_case_id"], ["benchmark_cases.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_benchmark_runs_benchmark_case_id", "benchmark_runs", ["benchmark_case_id"])

    op.create_table(
        "benchmark_results",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("benchmark_run_id", sa.Uuid(), nullable=False),
        sa.Column("predicted_price", sa.Numeric(10, 2), nullable=True),
        sa.Column("predicted_minimum_price", sa.Numeric(10, 2), nullable=True),
        sa.Column("predicted_risk_level", sa.String(length=32), nullable=True),
        sa.Column("predicted_action_type", sa.String(length=64), nullable=True),
        sa.Column("predicted_match_count", sa.Integer(), nullable=True),
        sa.Column("pricing_within_band", sa.Boolean(), nullable=True),
        sa.Column("risk_match", sa.Boolean(), nullable=True),
        sa.Column("action_match", sa.Boolean(), nullable=True),
        sa.Column("match_count_reasonable", sa.Boolean(), nullable=True),
        sa.Column("overall_score", sa.Numeric(5, 2), nullable=True),
        sa.Column("raw_result", json_type, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["benchmark_run_id"], ["benchmark_runs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_benchmark_results_benchmark_run_id", "benchmark_results", ["benchmark_run_id"])

    op.create_table(
        "baseline_results",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("benchmark_case_id", sa.Uuid(), nullable=False),
        sa.Column("baseline_name", sa.String(length=100), nullable=False),
        sa.Column("predicted_price", sa.Numeric(10, 2), nullable=True),
        sa.Column("predicted_risk_level", sa.String(length=32), nullable=True),
        sa.Column("predicted_action_type", sa.String(length=64), nullable=True),
        sa.Column("predicted_match_count", sa.Integer(), nullable=True),
        sa.Column("pricing_within_band", sa.Boolean(), nullable=True),
        sa.Column("risk_match", sa.Boolean(), nullable=True),
        sa.Column("action_match", sa.Boolean(), nullable=True),
        sa.Column("overall_score", sa.Numeric(5, 2), nullable=True),
        sa.Column("raw_result", json_type, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["benchmark_case_id"], ["benchmark_cases.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_baseline_results_benchmark_case_id", "baseline_results", ["benchmark_case_id"])


def downgrade() -> None:
    op.drop_index("ix_baseline_results_benchmark_case_id", table_name="baseline_results")
    op.drop_table("baseline_results")
    op.drop_index("ix_benchmark_results_benchmark_run_id", table_name="benchmark_results")
    op.drop_table("benchmark_results")
    op.drop_index("ix_benchmark_runs_benchmark_case_id", table_name="benchmark_runs")
    op.drop_table("benchmark_runs")
    op.drop_index("ix_benchmark_cases_category", table_name="benchmark_cases")
    op.drop_table("benchmark_cases")
