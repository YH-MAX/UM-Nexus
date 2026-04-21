from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.benchmark_case import BenchmarkCase
    from app.models.benchmark_result import BenchmarkResult


class BenchmarkRun(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "benchmark_runs"

    benchmark_case_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False),
        ForeignKey("benchmark_cases.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    model_name: Mapped[str] = mapped_column(String(100), nullable=False)
    run_status: Mapped[str] = mapped_column(String(32), nullable=False)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    benchmark_case: Mapped["BenchmarkCase"] = relationship(back_populates="runs")
    result: Mapped["BenchmarkResult | None"] = relationship(
        back_populates="benchmark_run",
        cascade="all, delete-orphan",
        uselist=False,
    )
