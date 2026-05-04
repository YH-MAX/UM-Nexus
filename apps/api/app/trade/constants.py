from typing import Literal


TradeCategory = Literal[
    "textbooks_notes",
    "electronics",
    "dorm_room",
    "kitchen_appliances",
    "furniture",
    "clothing",
    "sports_hobby",
    "tickets_events",
    "free_items",
    "others",
]
PickupArea = Literal["KK", "FSKTM", "library", "faculty_pickup", "other"]
ConditionLabel = Literal["new", "like_new", "good", "fair", "poor"]
ListingStatus = Literal["available", "reserved", "sold", "hidden", "removed"]
ContactMethod = Literal["telegram", "whatsapp"]
ContactRequestStatus = Literal["pending", "accepted", "rejected"]
UserStatus = Literal["active", "suspended", "banned"]
RiskLevel = Literal["low", "medium", "high"]
TradeActionType = Literal[
    "list_now",
    "revise_price",
    "upload_better_image",
    "match_with_buyers",
    "flag_for_review",
]

TRADE_CATEGORIES = (
    "textbooks_notes",
    "electronics",
    "dorm_room",
    "kitchen_appliances",
    "furniture",
    "clothing",
    "sports_hobby",
    "tickets_events",
    "free_items",
    "others",
)
PICKUP_AREAS = ("KK", "FSKTM", "library", "faculty_pickup", "other")
CONDITION_LABELS = ("new", "like_new", "good", "fair", "poor")
LISTING_STATUSES = ("available", "reserved", "sold", "hidden", "removed")
PUBLIC_LISTING_STATUSES = ("available", "reserved", "sold")
CONTACT_METHODS = ("telegram", "whatsapp")
CONTACT_REQUEST_STATUSES = ("pending", "accepted", "rejected")
USER_STATUSES = ("active", "suspended", "banned")
RISK_LEVELS = ("low", "medium", "high")
TRADE_ACTION_TYPES = (
    "list_now",
    "revise_price",
    "upload_better_image",
    "match_with_buyers",
    "flag_for_review",
)

LEGACY_CATEGORY_ALIASES = {
    "book": "textbooks_notes",
    "books": "textbooks_notes",
    "textbook": "textbooks_notes",
    "textbooks": "textbooks_notes",
    "textbooks_notes": "textbooks_notes",
    "study_tools": "textbooks_notes",
    "small_appliance": "kitchen_appliances",
    "small_appliances": "kitchen_appliances",
    "appliance": "kitchen_appliances",
    "appliances": "kitchen_appliances",
    "dorm": "dorm_room",
    "dorm_essentials": "dorm_room",
    "dorm_room": "dorm_room",
    "room": "dorm_room",
}

LEGACY_LISTING_STATUS_ALIASES = {
    "active": "available",
    "open": "available",
    "closed": "sold",
    "completed": "sold",
    "deleted": "removed",
}
