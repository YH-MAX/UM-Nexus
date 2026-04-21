from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.wanted_post import WantedPostRead
from app.trade.constants import RiskLevel, TradeActionType


class MatchCandidate(BaseModel):
    wanted_post_id: str
    title: str
    match_score: float
    price_fit_score: float | None
    location_fit_score: float | None
    semantic_fit_score: float | None
    explanation: str
    price_fit_summary: str
    location_fit_summary: str
    item_fit_summary: str
    final_match_confidence: str
    max_budget: float | None
    preferred_pickup_area: str | None


class TradeMatchRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    listing_id: str
    wanted_post_id: str
    match_score: float
    price_fit_score: float | None
    location_fit_score: float | None
    semantic_fit_score: float | None
    status: str
    explanation: str | None
    contacted_by_user_id: str | None = None
    contacted_at: datetime | None = None
    contact_message: str | None = None
    created_at: datetime
    updated_at: datetime
    wanted_post: WantedPostRead


class PriceRangeBlock(BaseModel):
    low: float
    high: float


class TradeRecommendation(BaseModel):
    suggested_listing_price: float
    minimum_acceptable_price: float
    sell_fast_price: float | None = None
    risk_score: float | None = None
    risk_level: RiskLevel
    best_match_candidates: list[MatchCandidate]
    fair_price_range: PriceRangeBlock | None = None


class TradeWhy(BaseModel):
    similar_item_pattern: str
    condition_estimate: str
    local_demand_context: str
    price_competitiveness: str
    evidence: list[str] = Field(default_factory=list)


class TradeExpectedOutcome(BaseModel):
    expected_time_to_sell: str
    expected_buyer_interest: str
    confidence_level: str
    confidence_factors: list[str] = Field(default_factory=list)


class TradeAction(BaseModel):
    action_type: TradeActionType
    action_reason: str
    next_steps: list[str] = Field(default_factory=list)


class TradeDecisionMetadata(BaseModel):
    provider: str = "heuristic"
    model: str | None = None
    used_fallback: bool = False
    generated_at: datetime | None = None


class TradeDecisionResult(BaseModel):
    recommendation: TradeRecommendation
    why: TradeWhy
    expected_outcome: TradeExpectedOutcome
    action: TradeAction
    metadata: TradeDecisionMetadata = Field(default_factory=TradeDecisionMetadata)


class GLMTestResponse(BaseModel):
    success: bool
    model: str
    message_preview: str | None = None
    response_text: str | None = None
    error_message: str | None = None


class RecommendationBlock(TradeRecommendation):
    pass


class WhyBlock(TradeWhy):
    pass


class ExpectedOutcomeBlock(TradeExpectedOutcome):
    pass


class ActionBlock(TradeAction):
    pass


class TradeIntelligenceResult(TradeDecisionResult):
    pass


class EnrichListingAccepted(BaseModel):
    listing_id: str
    agent_run_id: str
    status: str
    message: str


class TradeIntelligenceResultStatus(BaseModel):
    listing_id: str
    status: str
    agent_run_id: str | None = None
    last_run_id: str | None = None
    updated_at: datetime | None = None
    error_message: str | None = None
    result: TradeIntelligenceResult | None = None
