from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, TYPE_CHECKING

from sqlalchemy import DateTime, Integer, Numeric, String, Text, func
from sqlalchemy.dialects import postgresql
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.db.base import Base
from app.models.mixins import UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.baseline_result import BaselineResult
    from app.models.benchmark_run import BenchmarkRun


JsonPayload = JSON().with_variant(postgresql.JSONB, "postgresql")


class BenchmarkCase(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "benchmark_cases"

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    listing_title: Mapped[str] = mapped_column(String(255), nullable=False)
    listing_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    condition_label: Mapped[str | None] = mapped_column(String(64), nullable=True)
    pickup_area: Mapped[str | None] = mapped_column(String(64), nullable=True)
    residential_college: Mapped[str | None] = mapped_column(String(255), nullable=True)
    image_urls: Mapped[list[str] | None] = mapped_column(JsonPayload, nullable=True)
    expected_price_min: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    expected_price_max: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    expected_risk_level: Mapped[str | None] = mapped_column(String(32), nullable=True)
    expected_action_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    expected_best_match_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    expected_best_match_ids: Mapped[list[str] | None] = mapped_column(JsonPayload, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    runs: Mapped[list["BenchmarkRun"]] = relationship(
        back_populates="benchmark_case",
        cascade="all, delete-orphan",
    )
    baseline_results: Mapped[list["BaselineResult"]] = relationship(
        back_populates="benchmark_case",
        cascade="all, delete-orphan",
    )
