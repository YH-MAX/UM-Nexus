from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from typing import Any

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, Numeric, String, Text, Uuid
from sqlalchemy.dialects import postgresql
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.db.base import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.listing_embedding import ListingEmbedding
    from app.models.listing_favorite import ListingFavorite
    from app.models.listing_image import ListingImage
    from app.models.listing_report import ListingReport
    from app.models.listing_view import ListingView
    from app.models.trade_contact_request import TradeContactRequest
    from app.models.trade_match import TradeMatch
    from app.models.user import User


JsonPayload = JSON().with_variant(postgresql.JSONB, "postgresql")


class Listing(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "listings"
    __table_args__ = (
        Index("listings_status_moderation_idx", "status", "moderation_status"),
        Index("listings_category_status_idx", "category", "status"),
        Index("listings_created_at_idx", "created_at"),
        Index("listings_price_idx", "price"),
        Index("listings_pickup_location_idx", "pickup_location"),
    )

    seller_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    item_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    brand: Mapped[str | None] = mapped_column(String(255), nullable=True)
    model: Mapped[str | None] = mapped_column(String(255), nullable=True)
    condition_label: Mapped[str | None] = mapped_column(String(64), nullable=True)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    original_price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="MYR", server_default="MYR")
    pickup_area: Mapped[str | None] = mapped_column(String(64), nullable=True)
    pickup_location: Mapped[str | None] = mapped_column(String(64), nullable=True)
    pickup_note: Mapped[str | None] = mapped_column(String(500), nullable=True)
    residential_college: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_method: Mapped[str | None] = mapped_column(String(32), nullable=True)
    contact_value: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source_wanted_post_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False),
        ForeignKey("wanted_posts.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    sold_source: Mapped[str | None] = mapped_column(String(64), nullable=True)
    sold_contact_request_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False),
        ForeignKey(
            "trade_contact_requests.id",
            ondelete="SET NULL",
            use_alter=True,
            name="fk_listings_sold_contact_request_id_trade_contact_requests",
        ),
        nullable=True,
        index=True,
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="available", server_default="available")
    view_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    hidden_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    hidden_by: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    hidden_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deleted_by: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    deleted_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    risk_score: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, default=0, server_default="0")
    risk_level: Mapped[str | None] = mapped_column(String(32), nullable=True)
    risk_evidence: Mapped[dict[str, Any] | None] = mapped_column(JsonPayload, nullable=True)
    moderation_status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="approved",
        server_default="approved",
    )
    suggested_listing_price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    minimum_acceptable_price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    accepted_recommended_price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    recommendation_applied_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ai_explanation_cache: Mapped[dict[str, Any] | None] = mapped_column(JsonPayload, nullable=True)
    is_ai_enriched: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")

    seller: Mapped["User"] = relationship(foreign_keys=[seller_id])
    images: Mapped[list["ListingImage"]] = relationship(
        back_populates="listing",
        cascade="all, delete-orphan",
        order_by="ListingImage.sort_order",
    )
    matches: Mapped[list["TradeMatch"]] = relationship(
        back_populates="listing",
        cascade="all, delete-orphan",
    )
    reports: Mapped[list["ListingReport"]] = relationship(
        back_populates="listing",
        cascade="all, delete-orphan",
    )
    contact_requests: Mapped[list["TradeContactRequest"]] = relationship(
        back_populates="listing",
        cascade="all, delete-orphan",
        foreign_keys="TradeContactRequest.listing_id",
    )
    favorites: Mapped[list["ListingFavorite"]] = relationship(
        back_populates="listing",
        cascade="all, delete-orphan",
    )
    views: Mapped[list["ListingView"]] = relationship(
        back_populates="listing",
        cascade="all, delete-orphan",
    )
    embedding: Mapped["ListingEmbedding | None"] = relationship(
        back_populates="listing",
        cascade="all, delete-orphan",
        uselist=False,
    )

    @property
    def condition(self) -> str | None:
        return self.condition_label
