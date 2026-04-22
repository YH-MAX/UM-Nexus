from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.ai_trade import TradeMatchRead
from app.schemas.listing import ListingRead, ListingReportRead
from app.schemas.wanted_post import WantedPostRead


class ContactMatchCreate(BaseModel):
    message: str | None = Field(default=None, max_length=2000)


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
    wanted_posts: list[WantedPostRead]
    matches: list[TradeMatchRead]
    transactions: list[TradeTransactionRead]
    metrics: TradeDashboardMetrics = Field(default_factory=TradeDashboardMetrics)


class ModerationListingRead(BaseModel):
    listing: ListingRead
    reports: list[ListingReportRead]


class ModerationSummary(BaseModel):
    high_risk_count: int = 0
    pending_review_count: int = 0
    rejected_count: int = 0
    approved_count: int = 0


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
