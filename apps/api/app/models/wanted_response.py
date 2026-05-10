from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.listing import Listing
    from app.models.user import User
    from app.models.wanted_post import WantedPost


class WantedResponse(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "wanted_responses"

    wanted_post_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False),
        ForeignKey("wanted_posts.id", ondelete="CASCADE"),
        nullable=False,
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
    listing_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False),
        ForeignKey("listings.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    seller_contact_method: Mapped[str] = mapped_column(String(32), nullable=False)
    seller_contact_value: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending", server_default="pending")
    buyer_response: Mapped[str | None] = mapped_column(Text, nullable=True)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    rejected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    wanted_post: Mapped["WantedPost"] = relationship(back_populates="responses")
    seller: Mapped["User"] = relationship(foreign_keys=[seller_id])
    buyer: Mapped["User"] = relationship(foreign_keys=[buyer_id])
    listing: Mapped["Listing | None"] = relationship()
