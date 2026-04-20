from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, ForeignKey, String, Uuid, func
from sqlalchemy.dialects import postgresql
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.db.base import Base
from app.models.mixins import UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.agent_run import AgentRun


JsonPayload = JSON().with_variant(postgresql.JSONB, "postgresql")


class AgentOutput(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "agent_outputs"

    agent_run_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False),
        ForeignKey("agent_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    output_type: Mapped[str] = mapped_column(String(100), nullable=False)
    content: Mapped[dict[str, Any]] = mapped_column(JsonPayload, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    agent_run: Mapped["AgentRun"] = relationship(back_populates="outputs")
