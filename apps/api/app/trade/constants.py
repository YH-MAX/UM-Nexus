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
PickupArea = Literal[
    "kk1",
    "kk2",
    "kk3",
    "kk4",
    "kk5",
    "kk6",
    "kk7",
    "kk8",
    "kk9",
    "kk10",
    "kk11",
    "kk12",
    "fsktm",
    "main_library",
    "um_sentral",
    "faculty_area",
    "kk_mart",
    "other",
]
ConditionLabel = Literal["new", "like_new", "good", "fair", "poor"]
ListingStatus = Literal["draft", "available", "reserved", "sold", "hidden", "deleted"]
ContactMethod = Literal["in_app", "telegram", "whatsapp", "email"]
ContactRequestStatus = Literal["pending", "accepted", "rejected", "cancelled", "expired"]
UserStatus = Literal["active", "suspended", "banned", "deleted"]
RiskLevel = Literal["low", "medium", "high"]
ModerationStatus = Literal["clear", "flagged", "review_required", "approved", "rejected"]
ListingReportReason = Literal[
    "scam_suspicion",
    "prohibited_item",
    "misleading_description",
    "duplicate_listing",
    "offensive_content",
    "fake_photos",
    "unsafe_transaction",
    "other",
]
ReportStatus = Literal["pending", "reviewed", "dismissed", "action_taken"]
UserReportReason = Literal[
    "harassment",
    "repeated_no_show",
    "suspicious_payment_behavior",
    "abusive_messages",
    "fake_identity",
    "other",
]
AdminActionType = Literal[
    "hide_listing",
    "restore_listing",
    "delete_listing",
    "dismiss_report",
    "mark_report_action_taken",
    "suspend_user",
    "ban_user",
    "restore_user",
    "remove_image",
    "change_category",
    "change_user_role",
]
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
PICKUP_AREAS = (
    "kk1",
    "kk2",
    "kk3",
    "kk4",
    "kk5",
    "kk6",
    "kk7",
    "kk8",
    "kk9",
    "kk10",
    "kk11",
    "kk12",
    "fsktm",
    "main_library",
    "um_sentral",
    "faculty_area",
    "kk_mart",
    "other",
)
CONDITION_LABELS = ("new", "like_new", "good", "fair", "poor")
LISTING_STATUSES = ("draft", "available", "reserved", "sold", "hidden", "deleted")
PUBLIC_LISTING_STATUSES = ("available", "reserved")
CONTACT_METHODS = ("in_app", "telegram", "whatsapp", "email")
CONTACT_REQUEST_STATUSES = ("pending", "accepted", "rejected", "cancelled", "expired")
USER_STATUSES = ("active", "suspended", "banned", "deleted")
RISK_LEVELS = ("low", "medium", "high")
MODERATION_STATUSES = ("clear", "flagged", "review_required", "approved", "rejected")
LISTING_REPORT_REASONS = (
    "scam_suspicion",
    "prohibited_item",
    "misleading_description",
    "duplicate_listing",
    "offensive_content",
    "fake_photos",
    "unsafe_transaction",
    "other",
)
REPORT_STATUSES = ("pending", "reviewed", "dismissed", "action_taken")
USER_REPORT_REASONS = (
    "harassment",
    "repeated_no_show",
    "suspicious_payment_behavior",
    "abusive_messages",
    "fake_identity",
    "other",
)
ADMIN_ACTION_TYPES = (
    "hide_listing",
    "restore_listing",
    "delete_listing",
    "dismiss_report",
    "mark_report_action_taken",
    "suspend_user",
    "ban_user",
    "restore_user",
    "remove_image",
    "change_category",
    "change_user_role",
)
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
    "removed": "deleted",
}

LEGACY_PICKUP_AREA_ALIASES = {
    "kk": "kk1",
    "kolej_kediaman": "kk1",
    "fsk": "fsktm",
    "faculty": "faculty_area",
    "faculty_pickup": "faculty_area",
    "library": "main_library",
    "main_lib": "main_library",
    "umcentral": "um_sentral",
    "um_central": "um_sentral",
    "sentral": "um_sentral",
    "kkmart": "kk_mart",
}
