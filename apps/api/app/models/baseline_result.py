from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Uuid, func
from sqlalchemy.dialects import postgresql
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.db.base import Base
from app.models.mixins import UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.benchmark_case import BenchmarkCase


JsonPayload = JSON().with_variant(postgresql.JSONB, "postgresql")


class BaselineResult(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "baseline_results"

    benchmark_case_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False),
        ForeignKey("benchmark_cases.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    baseline_name: Mapped[str] = mapped_column(String(100), nullable=False)
    predicted_price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    predicted_risk_level: Mapped[str | None] = mapped_column(String(32), nullable=True)
    predicted_action_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    predicted_match_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    pricing_within_band: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    risk_match: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    action_match: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    overall_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    raw_result: Mapped[dict[str, Any] | None] = mapped_column(JsonPayload, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    benchmark_case: Mapped["BenchmarkCase"] = relationship(back_populates="baseline_results")
