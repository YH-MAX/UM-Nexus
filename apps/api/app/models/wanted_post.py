from __future__ import annotations

from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Numeric, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.trade_match import TradeMatch
    from app.models.user import User
    from app.models.wanted_post_embedding import WantedPostEmbedding


class WantedPost(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "wanted_posts"

    buyer_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    desired_item_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    max_budget: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="MYR", server_default="MYR")
    preferred_pickup_area: Mapped[str | None] = mapped_column(String(64), nullable=True)
    residential_college: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active", server_default="active")

    buyer: Mapped["User"] = relationship()
    matches: Mapped[list["TradeMatch"]] = relationship(
        back_populates="wanted_post",
        cascade="all, delete-orphan",
    )
    embedding: Mapped["WantedPostEmbedding | None"] = relationship(
        back_populates="wanted_post",
        cascade="all, delete-orphan",
        uselist=False,
    )
