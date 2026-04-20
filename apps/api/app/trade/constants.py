from typing import Literal


TradeCategory = Literal["textbooks", "electronics", "small_appliances", "dorm_essentials"]
PickupArea = Literal["KK", "FSKTM", "library", "faculty_pickup", "other"]
RiskLevel = Literal["low", "medium", "high"]
TradeActionType = Literal[
    "list_now",
    "revise_price",
    "upload_better_image",
    "match_with_buyers",
    "flag_for_review",
]

TRADE_CATEGORIES = ("textbooks", "electronics", "small_appliances", "dorm_essentials")
PICKUP_AREAS = ("KK", "FSKTM", "library", "faculty_pickup", "other")
RISK_LEVELS = ("low", "medium", "high")
TRADE_ACTION_TYPES = (
    "list_now",
    "revise_price",
    "upload_better_image",
    "match_with_buyers",
    "flag_for_review",
)
