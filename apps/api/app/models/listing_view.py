from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, ForeignKey, String, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.listing import Listing
    from app.models.user import User


class ListingView(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "listing_views"
    __table_args__ = (
        UniqueConstraint("listing_id", "viewer_fingerprint", "viewed_on", name="uq_listing_views_daily_fingerprint"),
    )

    listing_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False),
        ForeignKey("listings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    viewer_user_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    viewer_fingerprint: Mapped[str] = mapped_column(String(128), nullable=False)
    viewed_on: Mapped[date] = mapped_column(Date, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    listing: Mapped["Listing"] = relationship(back_populates="views")
    viewer: Mapped["User | None"] = relationship()
