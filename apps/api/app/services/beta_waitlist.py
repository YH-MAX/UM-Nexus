from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import BetaWaitlistEntry
from app.schemas.beta import BetaWaitlistCreate
from app.services.user_sync import ensure_allowed_email_domain


def create_or_update_waitlist_entry(db: Session, payload: BetaWaitlistCreate) -> BetaWaitlistEntry:
    normalized_email = str(payload.email).strip().lower()
    ensure_allowed_email_domain(normalized_email)

    entry = db.scalar(select(BetaWaitlistEntry).where(BetaWaitlistEntry.email == normalized_email))
    if entry is None:
        entry = BetaWaitlistEntry(email=normalized_email, reason=payload.reason)
    else:
        entry.reason = payload.reason

    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry
