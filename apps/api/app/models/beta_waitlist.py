from __future__ import annotations

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class BetaWaitlistEntry(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "beta_waitlist"

    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
