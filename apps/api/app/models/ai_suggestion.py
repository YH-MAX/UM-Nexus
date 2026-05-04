from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text, Uuid, func
from sqlalchemy.dialects import postgresql
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from app.db.base import Base
from app.models.mixins import UUIDPrimaryKeyMixin


JsonPayload = JSON().with_variant(postgresql.JSONB, "postgresql")


class AISuggestion(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "ai_suggestions"

    user_id: Mapped[str] = mapped_column(Uuid(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    listing_id: Mapped[str | None] = mapped_column(Uuid(as_uuid=False), ForeignKey("listings.id", ondelete="SET NULL"), nullable=True, index=True)
    input_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    input_image_urls: Mapped[list[str] | None] = mapped_column(JsonPayload, nullable=True)
    suggested_title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    suggested_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    suggested_category: Mapped[str | None] = mapped_column(String(64), nullable=True)
    suggested_condition: Mapped[str | None] = mapped_column(String(64), nullable=True)
    price_min: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    price_max: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    recommended_price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    risk_level: Mapped[str | None] = mapped_column(String(32), nullable=True)
    risk_flags: Mapped[list[str] | None] = mapped_column(JsonPayload, nullable=True)
    raw_response: Mapped[dict[str, Any] | None] = mapped_column(JsonPayload, nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="generated", server_default="generated")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
