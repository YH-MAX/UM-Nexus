from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.listing import ListingCreate, ListingImageRead, ListingRead
from app.schemas.trade_intelligence import EnrichListingAccepted, PriceRangeBlock, TradeAction, TradeExpectedOutcome, TradeWhy
from app.trade.constants import RiskLevel


SellerGoal = Literal["sell_fast", "fair_price", "maximize_revenue"]
ConfidenceLevel = Literal["low", "medium", "high"]


class SellAgentSellerContext(BaseModel):
    product_name: str | None = Field(default=None, max_length=255)
    free_text: str | None = Field(default=None, max_length=2000)
    category_hint: str | None = Field(default=None, max_length=64)
    condition_notes: str | None = Field(default=None, max_length=1000)
    brand_model: str | None = Field(default=None, max_length=255)
    age_usage: str | None = Field(default=None, max_length=500)
    defects: str | None = Field(default=None, max_length=500)
    accessories: str | None = Field(default=None, max_length=500)
    pickup_area: str | None = Field(default=None, max_length=64)
    residential_college: str | None = Field(default=None, max_length=255)
    seller_goal: SellerGoal = "fair_price"


class SellAgentUploadedImage(BaseModel):
    storage_bucket: str
    storage_path: str
    public_url: str | None = None
    mime_type: str | None = None
    file_size: int | None = None
    content_hash: str | None = None
    sort_order: int = 0
    is_primary: bool = False


class SellAgentPricing(BaseModel):
    suggested_listing_price: float
    minimum_acceptable_price: float
    sell_fast_price: float | None = None
    fair_price_range: PriceRangeBlock
    risk_level: RiskLevel


class SellAgentPriceOption(BaseModel):
    type: SellerGoal
    price: float
    expected_time_to_sell: str
    buyer_interest: str
    tradeoff_summary: str


class SellAgentConfidenceItem(BaseModel):
    level: ConfidenceLevel
    reason: str


class SellAgentMetadata(BaseModel):
    provider: str = "heuristic"
    model: str | None = None
    used_fallback: bool = False
    generated_at: datetime | None = None
    analysis_mode: str = "deterministic_fallback"
    image_analysis_skipped: bool = False
    data_source: str = "sell_agent_draft"


class SellAgentDraftResponse(BaseModel):
    draft_id: str
    assistant_message: str
    missing_fields: list[str] = Field(default_factory=list)
    uploaded_images: list[SellAgentUploadedImage] = Field(default_factory=list)
    listing_payload: ListingCreate
    pricing: SellAgentPricing
    price_options: list[SellAgentPriceOption] = Field(default_factory=list)
    confidence_breakdown: dict[str, SellAgentConfidenceItem] = Field(default_factory=dict)
    field_explanations: dict[str, str] = Field(default_factory=dict)
    why: TradeWhy
    expected_outcome: TradeExpectedOutcome
    action: TradeAction
    metadata: SellAgentMetadata = Field(default_factory=SellAgentMetadata)


class SellAgentPublishRequest(BaseModel):
    draft_id: str | None = None
    listing_payload: ListingCreate
    uploaded_images: list[SellAgentUploadedImage] = Field(default_factory=list)


class SellAgentPublishResponse(BaseModel):
    listing: ListingRead
    uploaded_images: list[ListingImageRead] = Field(default_factory=list)
    enrichment: EnrichListingAccepted
    result_status: str = "accepted"
