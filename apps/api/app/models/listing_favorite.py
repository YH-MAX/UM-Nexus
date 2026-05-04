from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.listing import Listing
    from app.models.user import User


class ListingFavorite(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "listing_favorites"
    __table_args__ = (UniqueConstraint("user_id", "listing_id", name="uq_listing_favorites_user_listing"),)

    user_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    listing_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False),
        ForeignKey("listings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    user: Mapped["User"] = relationship()
    listing: Mapped["Listing"] = relationship(back_populates="favorites")
