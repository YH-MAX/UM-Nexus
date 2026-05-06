from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.listing import Listing
    from app.models.trade_match import TradeMatch
    from app.models.user import User


class TradeTransaction(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "trade_transactions"

    listing_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False),
        ForeignKey("listings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    trade_match_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False),
        ForeignKey("trade_matches.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    contact_request_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False),
        ForeignKey("trade_contact_requests.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    seller_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    buyer_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="contacted", server_default="contacted")
    sale_source: Mapped[str | None] = mapped_column(String(64), nullable=True)
    agreed_price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="MYR", server_default="MYR")
    seller_feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    buyer_feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    followed_ai_recommendation: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    listing: Mapped["Listing"] = relationship()
    trade_match: Mapped["TradeMatch | None"] = relationship()
    seller: Mapped["User"] = relationship(foreign_keys=[seller_id])
    buyer: Mapped["User"] = relationship(foreign_keys=[buyer_id])
