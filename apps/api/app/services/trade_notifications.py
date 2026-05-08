from __future__ import annotations

from app.models import TradeContactRequest, User
from app.repositories.trade import TradeRepository


TRADE_NOTIFICATION_TYPES = frozenset(
    {
        "contact_request_received",
        "contact_request_accepted",
        "contact_request_rejected",
        "contact_request_cancelled",
        "contact_request_expired",
        "trade_marked_completed",
        "buyer_no_response",
        "listing_marked_reserved",
        "listing_marked_sold",
        "listing_hidden_by_moderation",
        "listing_reported",
        "report_reviewed",
        "wanted_match_listing_created",
    }
)


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
):
    if notification_type not in TRADE_NOTIFICATION_TYPES:
        raise ValueError(f"Unknown trade notification type: {notification_type}")
    return repo.create_notification(
        {
            "user_id": user_id,
            "type": notification_type,
            "title": title,
            "body": body,
            "action_url": action_url,
            "entity_type": entity_type,
            "entity_id": entity_id,
        }
    )


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
