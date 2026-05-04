from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.ai_trade import TradeMatchRead
from app.schemas.listing import ListingFavoriteRead, ListingRead, ListingReportRead
from app.schemas.wanted_post import WantedPostRead
from app.services.trade_policy import normalize_contact_method, normalize_listing_status
from app.trade.constants import ContactMethod, ListingStatus, UserStatus


class ContactMatchCreate(BaseModel):
    message: str | None = Field(default=None, max_length=2000)


class ContactRequestCreate(BaseModel):
    message: str | None = Field(default=None, max_length=2000)
    buyer_contact_method: ContactMethod
    buyer_contact_value: str = Field(..., min_length=1, max_length=255)

    @field_validator("buyer_contact_method", mode="before")
    @classmethod
    def normalize_contact_method_value(cls, value: object) -> object:
        return normalize_contact_method(value) or value


class ContactRequestDecision(BaseModel):
    status: Literal["accepted", "rejected"]
    seller_response: str | None = Field(default=None, max_length=2000)


class ContactRequestRead(BaseModel):
    id: str
    listing_id: str
    buyer_id: str
    seller_id: str
    message: str | None
    buyer_contact_method: str
    buyer_contact_value: str | None = None
    seller_contact_method: str | None = None
    seller_contact_value: str | None = None
    status: str
    seller_response: str | None
    accepted_at: datetime | None
    rejected_at: datetime | None
    cancelled_at: datetime | None = None
    expired_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    listing: ListingRead | None = None


class ContactRequestsResponse(BaseModel):
    received: list[ContactRequestRead] = Field(default_factory=list)
    sent: list[ContactRequestRead] = Field(default_factory=list)


class TradeTransactionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    listing_id: str
    trade_match_id: str | None
    seller_id: str
    buyer_id: str
    status: str
    agreed_price: float | None
    currency: str
    seller_feedback: str | None
    buyer_feedback: str | None
    followed_ai_recommendation: bool | None
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime


class TradeTransactionUpdate(BaseModel):
    status: str | None = Field(default=None, max_length=32)
    agreed_price: float | None = Field(default=None, gt=0)
    seller_feedback: str | None = Field(default=None, max_length=2000)
    buyer_feedback: str | None = Field(default=None, max_length=2000)
    followed_ai_recommendation: bool | None = None


class TradeDashboardMetrics(BaseModel):
    recommendations_accepted: int = 0
    decision_feedback_count: int = 0
    completed_sales_after_ai_recommendation: int = 0
    average_price_adjustment: float | None = None


class TradeDashboardResponse(BaseModel):
    listings: list[ListingRead]
    favorites: list[ListingFavoriteRead] = Field(default_factory=list)
    wanted_posts: list[WantedPostRead]
    matches: list[TradeMatchRead]
    transactions: list[TradeTransactionRead]
    contact_requests_received: list[ContactRequestRead] = Field(default_factory=list)
    contact_requests_sent: list[ContactRequestRead] = Field(default_factory=list)
    metrics: TradeDashboardMetrics = Field(default_factory=TradeDashboardMetrics)


class ModerationListingRead(BaseModel):
    listing: ListingRead
    reports: list[ListingReportRead]


class ModerationSummary(BaseModel):
    high_risk_count: int = 0
    pending_review_count: int = 0
    rejected_count: int = 0
    approved_count: int = 0


class UserReportCreate(BaseModel):
    report_type: str = Field(..., min_length=1, max_length=100)
    reason: str | None = Field(default=None, max_length=2000)


class UserReportRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    reported_user_id: str
    reporter_user_id: str | None
    report_type: str
    reason: str | None
    status: str
    moderator_user_id: str | None
    resolution: str | None
    reviewed_at: datetime | None
    created_at: datetime


class AdminListingUpdate(BaseModel):
    status: ListingStatus | None = None
    moderation_status: str | None = Field(default=None, max_length=32)
    resolution: str | None = Field(default=None, max_length=2000)
    reason: str | None = Field(default=None, max_length=2000)

    @field_validator("status", mode="before")
    @classmethod
    def normalize_status_value(cls, value: object) -> object:
        return normalize_listing_status(value)


class AdminUserStatusUpdate(BaseModel):
    status: UserStatus
    reason: str | None = Field(default=None, max_length=2000)


class AdminUserRoleUpdate(BaseModel):
    app_role: Literal["student", "organizer", "moderator", "admin"]
    reason: str | None = Field(default=None, max_length=2000)


class AdminUserSummary(BaseModel):
    id: str
    email: str
    username: str | None = None
    status: str
    app_role: str | None = None
    full_name: str | None = None
    display_name: str | None = None
    faculty: str | None = None
    residential_college: str | None = None
    college_or_location: str | None = None


class AdminStatistics(BaseModel):
    total_users: int = 0
    active_listings: int = 0
    sold_listings: int = 0
    reported_listings: int = 0
    new_listings_this_week: int = 0
    most_popular_categories: list[dict[str, int | str]] = Field(default_factory=list)
    reserved_listings: int = 0
    contact_requests_sent: int = 0
    contact_requests_accepted: int = 0
    favorite_count: int = 0
    report_count: int = 0
    ai_generations_used: int = 0
    ai_failure_rate: float = 0
    most_popular_pickup_locations: list[dict[str, int | str]] = Field(default_factory=list)


class AdminActionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    admin_id: str | None
    target_type: str
    target_id: str
    action_type: str
    reason: str | None
    created_at: datetime


class AIUsageLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str | None
    feature: str
    provider: str | None
    model: str | None
    request_status: str
    input_tokens: int | None
    output_tokens: int | None
    estimated_cost: float | None
    error_message: str | None
    created_at: datetime


class TradeCategoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    slug: str
    label: str
    sort_order: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class TradeCategoryCreate(BaseModel):
    slug: str = Field(..., min_length=2, max_length=64)
    label: str = Field(..., min_length=2, max_length=120)
    sort_order: int = 0
    is_active: bool = True


class TradeCategoryUpdate(BaseModel):
    label: str | None = Field(default=None, min_length=2, max_length=120)
    sort_order: int | None = None
    is_active: bool | None = None


class AISettingsRead(BaseModel):
    ai_trade_enabled: bool
    ai_student_daily_limit: int
    ai_staff_daily_limit: int
    ai_global_daily_limit: int


class AISettingsUpdate(BaseModel):
    ai_trade_enabled: bool | None = None
    ai_student_daily_limit: int | None = Field(default=None, ge=0)
    ai_staff_daily_limit: int | None = Field(default=None, ge=0)
    ai_global_daily_limit: int | None = Field(default=None, ge=0)


class AdminDashboardResponse(BaseModel):
    statistics: AdminStatistics
    listings: list[ListingRead] = Field(default_factory=list)
    listing_reports: list[ListingReportRead] = Field(default_factory=list)
    user_reports: list[UserReportRead] = Field(default_factory=list)
    suspicious_ai_flags: list[ListingRead] = Field(default_factory=list)
    users: list[AdminUserSummary] = Field(default_factory=list)
    categories: list[TradeCategoryRead] = Field(default_factory=list)
    ai_usage_logs: list[AIUsageLogRead] = Field(default_factory=list)
    admin_actions: list[AdminActionRead] = Field(default_factory=list)
    ai_settings: AISettingsRead | None = None


class DecisionFeedbackCreate(BaseModel):
    feedback_type: Literal["accepted_price", "rejected_price", "changed_price", "ignored_recommendation"]
    applied_price: float | None = Field(default=None, gt=0)
    reason: str | None = Field(default=None, max_length=2000)


class DecisionFeedbackRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    listing_id: str
    user_id: str
    feedback_type: str
    suggested_listing_price: float | None
    applied_price: float | None
    reason: str | None
    created_at: datetime
    updated_at: datetime


class WantedListingRecommendation(BaseModel):
    listing: ListingRead
    match_score: float
    price_fit_score: float | None
    location_fit_score: float | None
    semantic_fit_score: float | None
    final_match_confidence: str
    explanation: str
    price_fit_summary: str
    location_fit_summary: str
    item_fit_summary: str
    risk_note: str
    recommended_action: str
