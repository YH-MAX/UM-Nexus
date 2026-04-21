from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.listing import Listing
    from app.models.wanted_post import WantedPost


class TradeMatch(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "trade_matches"
    __table_args__ = (UniqueConstraint("listing_id", "wanted_post_id", name="uq_trade_matches_listing_wanted"),)

    listing_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False),
        ForeignKey("listings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    wanted_post_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False),
        ForeignKey("wanted_posts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    match_score: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    price_fit_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    location_fit_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    semantic_fit_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="suggested", server_default="suggested")
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    contacted_by_user_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    contacted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    contact_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    listing: Mapped["Listing"] = relationship(back_populates="matches")
    wanted_post: Mapped["WantedPost"] = relationship(back_populates="matches")
