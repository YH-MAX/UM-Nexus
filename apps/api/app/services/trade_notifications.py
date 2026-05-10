from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any

from app.models import TradeContactRequest, User
from app.repositories.trade import TradeRepository


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class NotificationDefinition:
    priority: str = "normal"
    group: str = "general"
    dedupe_window_minutes: int = 60


TRADE_NOTIFICATION_DEFINITIONS: dict[str, NotificationDefinition] = {
    "contact_request_received": NotificationDefinition(priority="high", group="request"),
    "contact_request_accepted": NotificationDefinition(priority="high", group="request"),
    "contact_request_rejected": NotificationDefinition(group="request"),
    "contact_request_cancelled": NotificationDefinition(group="request"),
    "contact_request_expired": NotificationDefinition(priority="low", group="request", dedupe_window_minutes=120),
    "trade_marked_completed": NotificationDefinition(group="request"),
    "buyer_no_response": NotificationDefinition(group="request"),
    "listing_marked_reserved": NotificationDefinition(priority="high", group="listing", dedupe_window_minutes=24 * 60),
    "listing_marked_sold": NotificationDefinition(priority="high", group="listing", dedupe_window_minutes=24 * 60),
    "listing_hidden_by_moderation": NotificationDefinition(priority="urgent", group="safety", dedupe_window_minutes=24 * 60),
    "listing_restored_by_moderation": NotificationDefinition(priority="high", group="safety", dedupe_window_minutes=24 * 60),
    "listing_reported": NotificationDefinition(priority="high", group="safety", dedupe_window_minutes=24 * 60),
    "report_reviewed": NotificationDefinition(group="safety", dedupe_window_minutes=24 * 60),
    "wanted_match_listing_created": NotificationDefinition(priority="high", group="wanted", dedupe_window_minutes=24 * 60),
}

TRADE_NOTIFICATION_TYPES = frozenset(TRADE_NOTIFICATION_DEFINITIONS)
NOTIFICATION_PRIORITIES = frozenset({"low", "normal", "high", "urgent"})


def create_trade_notification(
    repo: TradeRepository,
    *,
    user_id: str,
    notification_type: str,
    title: str,
    body: str,
    action_url: str | None = None,
    entity_type: str | None = None,
    entity_id: str | None = None,
    actor_id: str | None = None,
    metadata: dict[str, Any] | None = None,
    priority: str | None = None,
    dedupe_window_minutes: int | None = None,
):
    if notification_type not in TRADE_NOTIFICATION_TYPES:
        raise ValueError(f"Unknown trade notification type: {notification_type}")
    definition = TRADE_NOTIFICATION_DEFINITIONS[notification_type]
    resolved_priority = priority or definition.priority
    if resolved_priority not in NOTIFICATION_PRIORITIES:
        raise ValueError(f"Unknown notification priority: {resolved_priority}")
    window_minutes = definition.dedupe_window_minutes if dedupe_window_minutes is None else dedupe_window_minutes
    if window_minutes > 0:
        duplicate = repo.find_recent_notification(
            user_id=user_id,
            notification_type=notification_type,
            entity_type=entity_type,
            entity_id=entity_id,
            created_after=datetime.now(UTC) - timedelta(minutes=window_minutes),
        )
        if duplicate is not None:
            return duplicate
    return repo.create_notification(
        {
            "user_id": user_id,
            "actor_id": actor_id,
            "type": notification_type,
            "title": title,
            "body": body,
            "action_url": action_url,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "notification_metadata": metadata,
            "priority": resolved_priority,
        }
    )


def safe_create_trade_notification(repo: TradeRepository, **kwargs):
    try:
        return create_trade_notification(repo, **kwargs)
    except Exception:
        repo.db.rollback()
        logger.exception(
            "Failed to create trade notification",
            extra={
                "notification_type": kwargs.get("notification_type"),
                "user_id": kwargs.get("user_id"),
                "entity_type": kwargs.get("entity_type"),
                "entity_id": kwargs.get("entity_id"),
            },
        )
        return None


def contact_request_action_url(contact_request: TradeContactRequest, role: str) -> str:
    tab = "received" if role == "seller" else "sent"
    return f"/trade/dashboard?tab={tab}&request_id={contact_request.id}"


def contact_request_listing_title(contact_request: TradeContactRequest) -> str:
    return contact_request.listing.title if contact_request.listing else "this listing"


def user_display_name(user: User) -> str:
    profile = getattr(user, "profile", None)
    display_name = (
        getattr(profile, "display_name", None)
        or getattr(profile, "full_name", None)
        or getattr(user, "username", None)
    )
    if display_name:
        return str(display_name)
    email = getattr(user, "email", None)
    if email:
        return email.split("@", 1)[0]
    return "A UM student"
