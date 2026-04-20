from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict

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
    created_at: datetime
    updated_at: datetime
    wanted_post: WantedPostRead


class PriceRangeBlock(BaseModel):
    low: float
    high: float


class TradeRecommendation(BaseModel):
    suggested_listing_price: float
    minimum_acceptable_price: float
    risk_level: RiskLevel
    best_match_candidates: list[MatchCandidate]
    fair_price_range: PriceRangeBlock | None = None


class TradeWhy(BaseModel):
    similar_item_pattern: str
    condition_estimate: str
    local_demand_context: str
    price_competitiveness: str


class TradeExpectedOutcome(BaseModel):
    expected_time_to_sell: str
    expected_buyer_interest: str
    confidence_level: str


class TradeAction(BaseModel):
    action_type: TradeActionType
    action_reason: str


class TradeDecisionResult(BaseModel):
    recommendation: TradeRecommendation
    why: TradeWhy
    expected_outcome: TradeExpectedOutcome
    action: TradeAction


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
