from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, SmallInteger, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import AppRole
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.user import User


app_role_enum = Enum(
    AppRole,
    name="app_role",
    values_callable=lambda roles: [role.value for role in roles],
)


class Profile(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "profiles"

    user_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    display_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    faculty: Mapped[str | None] = mapped_column(String(255), nullable=True)
    year_of_study: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    residential_college: Mapped[str | None] = mapped_column(String(255), nullable=True)
    college_or_location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_preference: Mapped[str | None] = mapped_column(String(32), nullable=True)
    contact_value: Mapped[str | None] = mapped_column(String(255), nullable=True)
    verified_um_email: Mapped[bool] = mapped_column(default=False, nullable=False, server_default="false")
    trade_safety_acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    app_role: Mapped[AppRole] = mapped_column(
        app_role_enum,
        nullable=False,
        default=AppRole.STUDENT,
        server_default=AppRole.STUDENT.value,
    )

    user: Mapped["User"] = relationship(back_populates="profile")
