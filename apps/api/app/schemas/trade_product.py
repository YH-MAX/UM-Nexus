from __future__ import annotations

from datetime import datetime

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


class TradeDashboardResponse(BaseModel):
    listings: list[ListingRead]
    wanted_posts: list[WantedPostRead]
    matches: list[TradeMatchRead]
    transactions: list[TradeTransactionRead]


class ModerationListingRead(BaseModel):
    listing: ListingRead
    reports: list[ListingReportRead]
