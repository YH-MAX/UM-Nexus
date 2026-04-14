from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.media_asset import MediaAsset
    from app.models.notification import Notification
    from app.models.profile import Profile
    from app.models.society import Society


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    username: Mapped[str | None] = mapped_column(String(50), unique=True, index=True, nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active", server_default="active")

    profile: Mapped["Profile"] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        uselist=False,
    )
    created_societies: Mapped[list["Society"]] = relationship(back_populates="creator")
    notifications: Mapped[list["Notification"]] = relationship(back_populates="user")
    media_assets: Mapped[list["MediaAsset"]] = relationship(back_populates="owner_user")
