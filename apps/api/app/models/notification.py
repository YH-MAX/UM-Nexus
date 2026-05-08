from __future__ import annotations

from datetime import datetime
from typing import Any, TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Text, Uuid, func
from sqlalchemy.dialects import postgresql
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.db.base import Base
from app.models.mixins import UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.user import User


JsonPayload = JSON().with_variant(postgresql.JSONB, "postgresql")


class Notification(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "notifications"
    __table_args__ = (
        Index("notifications_user_read_idx", "user_id", "is_read"),
        Index("notifications_user_created_idx", "user_id", "created_at"),
        Index("notifications_entity_idx", "entity_type", "entity_id"),
        Index("notifications_dedupe_idx", "user_id", "type", "entity_type", "entity_id", "created_at"),
    )

    user_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    actor_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    type: Mapped[str] = mapped_column(String(100), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    action_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    entity_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    entity_id: Mapped[str | None] = mapped_column(Uuid(as_uuid=False), nullable=True)
    notification_metadata: Mapped[dict[str, Any] | None] = mapped_column("metadata", JsonPayload, nullable=True)
    priority: Mapped[str] = mapped_column(String(32), nullable=False, default="normal", server_default="normal")
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship(back_populates="notifications", foreign_keys=[user_id])
    actor: Mapped["User | None"] = relationship(foreign_keys=[actor_id])
