from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, ForeignKey, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.types import Vector
from app.models.mixins import UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.listing import Listing


class ListingEmbedding(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "listing_embeddings"

    listing_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False),
        ForeignKey("listings.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    embedding: Mapped[Any | None] = mapped_column(Vector(1536), nullable=True)
    model_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    source_text: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    listing: Mapped["Listing"] = relationship(back_populates="embedding")
