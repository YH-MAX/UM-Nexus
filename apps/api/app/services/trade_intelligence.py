from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from math import ceil
from re import findall
from statistics import median
from types import SimpleNamespace

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.integrations.glm_client import GLMProviderError, get_glm_client
from app.models import AgentRun, AppRole, HistoricalSale, Listing, TradeMatch, WantedPost
from app.models.user import User
from app.repositories.trade import TradeRepository
from app.schemas.trade_intelligence import (
    EnrichListingAccepted,
    MatchCandidate,
    PriceSimulationResponse,
    TradeIntelligenceResult,
    TradeIntelligenceResultStatus,
    TradeProviderStatus,
)
from app.services.embedding_service import make_demo_embedding_text
from app.services.recommendation_service import (
    MIN_SUGGESTED_MATCH_SCORE as RECOMMENDATION_MIN_SUGGESTED_MATCH_SCORE,
    recommend_buyers_for_listing,
    recommend_listings_for_wanted_post as build_listing_recommendations_for_wanted_post,
    recommended_match_candidates,
)
from app.services.trade_intelligence_glm_service import build_multimodal_glm_payload, generate_glm_trade_result


SUSPICIOUS_KEYWORDS = {
    "fake",
    "replica",
    "stolen",
    "locked",
    "icloud",
    "password",
    "no receipt",
    "bank transfer only",
    "urgent cash",
    "too good",
    "no warranty",
    "pay first",
}
GOOD_CONDITION_KEYWORDS = {"like new", "excellent", "barely used", "minor scratches", "minor scratch", "works well"}
POOR_CONDITION_KEYWORDS = {"broken", "faulty", "damaged", "not working", "missing", "cracked", "heavy scratches"}
CATEGORY_FALLBACK_PRICES = {
    "textbooks_notes": (28.0, 42.0, 58.0),
    "electronics": (60.0, 120.0, 220.0),
    "dorm_room": (18.0, 35.0, 70.0),
    "kitchen_appliances": (45.0, 95.0, 180.0),
    "furniture": (35.0, 80.0, 180.0),
    "clothing": (12.0, 28.0, 60.0),
    "sports_hobby": (20.0, 55.0, 120.0),
    "tickets_events": (10.0, 25.0, 80.0),
    "free_items": (0.0, 0.0, 0.0),
    "others": (15.0, 45.0, 100.0),
}
PRICING_STOPWORDS = {
    "the",
    "and",
    "for",
    "with",
    "used",
    "item",
    "good",
    "condition",
}
CONDITION_MULTIPLIERS = {
    "new": 1.18,
    "like_new": 1.12,
    "like new": 1.12,
    "excellent": 1.08,
    "good": 1.0,
    "used": 0.92,
    "fair": 0.84,
    "unknown": 0.88,
    "poor": 0.68,
}


@dataclass(frozen=True)
class PricingDecision:
    fair_low: float
    fair_high: float
    suggested_price: float
    minimum_price: float
    comparable_count: int
    similar_count: int
    pattern_summary: str
    price_competitiveness: str


@dataclass(frozen=True)
class RiskDecision:
    risk_score: float
    risk_level: str
    summary: str


def create_pending_trade_intelligence_run(
    db: Session,
    listing_id: str,
    current_user: User | None = None,
) -> EnrichListingAccepted:
    repo = TradeRepository(db)
    listing = repo.get_listing_or_none(listing_id)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    if current_user is not None and listing.seller_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the seller can enrich this listing.")
    if current_user is not None:
        denial = _ai_limit_denial(repo, current_user, feature="trade_enrichment")
        if denial:
            _log_ai_usage(
                repo,
                current_user,
                feature="trade_enrichment",
                request_status="denied",
                error_message=denial,
            )
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=denial)

    agent_run = repo.create_agent_run(
        {
            "agent_name": "trade_intelligence_orchestrator",
            "entity_type": "listing",
            "entity_id": listing.id,
            "status": "pending",
            "input_payload": _listing_input_payload(listing),
            "started_at": None,
        }
    )
    if current_user is not None:
        settings = get_settings()
        _log_ai_usage(
            repo,
            current_user,
            feature="trade_enrichment",
            request_status="queued",
            provider="zai" if settings.should_use_zai_provider else "demo",
            model=settings.zai_model if settings.should_use_zai_provider else "deterministic-campus-pricing-v1",
        )
    return EnrichListingAccepted(
        listing_id=listing.id,
        agent_run_id=agent_run.id,
        status="accepted",
        message="Trade Intelligence enrichment job accepted.",
    )


def compute_trade_intelligence(db: Session, listing_id: str, agent_run_id: str | None = None) -> TradeIntelligenceResult:
    repo = TradeRepository(db)
    listing = repo.get_listing_or_none(listing_id)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    agent_run = _get_or_create_running_run(repo, listing, agent_run_id)

    try:
        repo.update_agent_run(agent_run, {"status": "running", "started_at": datetime.now(UTC)})
        create_or_update_listing_embedding(db, listing.id)

        wanted_posts = list(repo.list_wanted_posts_by_category(listing.category))
        for wanted_post in wanted_posts:
            create_or_update_wanted_post_embedding(db, wanted_post.id)

        historical_sales = list(repo.list_historical_sales_for_category(listing.category))
        reports_count = repo.count_listing_reports(listing.id)
        duplicate_image_count = repo.count_duplicate_image_hashes(listing.id)
        heuristic_result, matches, risk_score = build_trade_intelligence_result(
            listing=listing,
            wanted_posts=wanted_posts,
            historical_sales=historical_sales,
            reports_count=reports_count,
            duplicate_image_count=duplicate_image_count,
        )
        glm_payload = build_multimodal_glm_payload(db, listing, historical_sales, wanted_posts, heuristic_result)
        provider_error: Exception | None = None
        try:
            result = generate_glm_trade_result(glm_payload)
        except (GLMProviderError, ValueError, TypeError) as exc:
            provider_error = exc
            result = _mark_fallback_result(heuristic_result, str(exc))

        decision_match_values = _match_values_from_result_candidates(result.recommendation.best_match_candidates, matches)
        for match_values in decision_match_values:
            wanted_post_id = match_values.pop("wanted_post_id")
            repo.upsert_trade_match(listing.id, wanted_post_id, match_values)

        decision_risk_score = _risk_score_for_decision(
            result.recommendation.risk_level,
            result.recommendation.risk_score,
            risk_score,
        )
        moderation_status = "review_required" if result.recommendation.risk_level == "high" else (listing.moderation_status or "approved")
        repo.update_listing(
            listing,
            {
                "risk_score": Decimal(str(decision_risk_score)),
                "risk_level": result.recommendation.risk_level,
                "suggested_listing_price": Decimal(str(result.recommendation.suggested_listing_price)),
                "minimum_acceptable_price": Decimal(str(result.recommendation.minimum_acceptable_price)),
                "risk_evidence": _risk_evidence_payload(result, decision_risk_score, duplicate_image_count),
                "moderation_status": moderation_status,
                "ai_explanation_cache": result.model_dump(mode="json"),
                "is_ai_enriched": True,
            },
        )
        repo.create_agent_output(agent_run.id, "trade_intelligence_context", glm_payload)
        if provider_error is not None:
            repo.create_agent_output(agent_run.id, "trade_intelligence_provider_error", {"error": str(provider_error)})
        repo.create_agent_output(agent_run.id, "trade_intelligence_result", result.model_dump(mode="json"))
        repo.update_agent_run(agent_run, {"status": "completed", "finished_at": datetime.now(UTC)})
        repo.create_ai_usage_log(
            {
                "user_id": listing.seller_id,
                "feature": "trade_enrichment",
                "provider": result.metadata.provider,
                "model": result.metadata.model,
                "request_status": "succeeded",
                "error_message": str(provider_error) if provider_error is not None else None,
            }
        )
        return result
    except Exception as exc:
        repo.update_agent_run(
            agent_run,
            {"status": "failed", "finished_at": datetime.now(UTC), "error_message": str(exc)},
        )
        repo.create_ai_usage_log(
            {
                "user_id": listing.seller_id,
                "feature": "trade_enrichment",
                "provider": None,
                "model": None,
                "request_status": "failed",
                "error_message": str(exc),
            }
        )
        raise


def get_trade_result_status(db: Session, listing_id: str) -> TradeIntelligenceResultStatus:
    repo = TradeRepository(db)
    listing = repo.get_listing_or_none(listing_id)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    latest_run = repo.get_latest_agent_run_for_listing(listing_id)
    latest_output = repo.get_latest_trade_result_for_listing(listing_id)
    if latest_output is not None:
        return TradeIntelligenceResultStatus(
            listing_id=listing_id,
            status="completed",
            agent_run_id=latest_output.agent_run_id,
            last_run_id=latest_output.agent_run_id,
            updated_at=latest_output.created_at,
            result=TradeIntelligenceResult.model_validate(latest_output.content),
        )
    if latest_run is None:
        return TradeIntelligenceResultStatus(listing_id=listing_id, status="not_started")
    return TradeIntelligenceResultStatus(
        listing_id=listing_id,
        status=latest_run.status,
        agent_run_id=latest_run.id,
        last_run_id=latest_run.id,
        updated_at=latest_run.finished_at or latest_run.started_at or latest_run.created_at,
        error_message=latest_run.error_message,
    )


def get_trade_provider_status(db: Session, *, live_check: bool = False) -> TradeProviderStatus:
    settings = get_settings()
    provider = "zai" if settings.should_use_zai_provider else "demo"
    status_label = "configured" if settings.should_use_zai_provider else "demo"
    message = "Provider settings are configured; live check was not requested."
    last_success = (
        db.query(AgentRun)
        .filter(
            AgentRun.agent_name == "trade_intelligence_orchestrator",
            AgentRun.status == "completed",
        )
        .order_by(AgentRun.finished_at.desc(), AgentRun.created_at.desc())
        .first()
    )

    if live_check:
        try:
            client = get_glm_client(settings)
            if hasattr(client, "health_check"):
                message = str(client.health_check())  # type: ignore[attr-defined]
            else:
                message = "Demo GLM provider is available."
            status_label = "healthy"
        except Exception as exc:
            status_label = "unhealthy"
            message = str(exc)

    return TradeProviderStatus(
        provider=provider,
        model=settings.zai_model if settings.should_use_zai_provider else "demo-glm-trade-intelligence",
        status=status_label,
        should_use_zai_provider=settings.should_use_zai_provider,
        fallback_mode="deterministic-campus-pricing-v1",
        live_checked=live_check,
        last_successful_call_at=last_success.finished_at if last_success else None,
        message=message,
    )


def list_matches_for_listing(
    db: Session,
    listing_id: str,
    *,
    limit: int = 10,
    min_score: float = RECOMMENDATION_MIN_SUGGESTED_MATCH_SCORE,
) -> list[TradeMatch]:
    repo = TradeRepository(db)
    listing = repo.get_listing_or_none(listing_id)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    return list(repo.list_matches_for_listing(listing_id, min_score=min_score, limit=limit))


def recommend_listings_for_wanted_post(
    db: Session,
    wanted_post_id: str,
    *,
    limit: int = 12,
    min_score: float = RECOMMENDATION_MIN_SUGGESTED_MATCH_SCORE,
) -> list[dict]:
    repo = TradeRepository(db)
    wanted_post = repo.get_wanted_post_or_none(wanted_post_id)
    if wanted_post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wanted post not found")
    if wanted_post.status != "active":
        return []

    historical_sales = list(repo.list_historical_sales_for_category(wanted_post.category))
    listing_pricing_pairs = [
        (listing, _pricing_decision(listing, historical_sales))
        for listing in repo.list_listings_by_category(wanted_post.category)
    ]
    return build_listing_recommendations_for_wanted_post(
        wanted_post,
        listing_pricing_pairs,
        min_score=min_score,
        limit=limit,
    )


def simulate_listing_price(
    db: Session,
    listing_id: str,
    proposed_price: float,
) -> PriceSimulationResponse:
    repo = TradeRepository(db)
    listing = repo.get_listing_or_none(listing_id)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    simulated_listing = SimpleNamespace(
        id=listing.id,
        seller_id=listing.seller_id,
        title=listing.title,
        description=listing.description,
        category=listing.category,
        item_name=listing.item_name,
        brand=listing.brand,
        model=listing.model,
        condition_label=listing.condition_label,
        price=Decimal(str(proposed_price)),
        currency=listing.currency,
        pickup_area=listing.pickup_area,
        residential_college=listing.residential_college,
        status=listing.status,
        images=listing.images,
        created_at=listing.created_at,
    )
    result, _matches, _risk_score = build_trade_intelligence_result(
        listing=simulated_listing,  # type: ignore[arg-type]
        wanted_posts=list(repo.list_wanted_posts_by_category(listing.category)),
        historical_sales=list(repo.list_historical_sales_for_category(listing.category)),
        reports_count=repo.count_listing_reports(listing.id),
        duplicate_image_count=repo.count_duplicate_image_hashes(listing.id),
    )
    return PriceSimulationResponse(
        listing_id=listing.id,
        proposed_price=proposed_price,
        current_price=float(listing.price),
        suggested_listing_price=result.recommendation.suggested_listing_price,
        minimum_acceptable_price=result.recommendation.minimum_acceptable_price,
        fair_price_range=result.recommendation.fair_price_range,
        price_competitiveness=result.why.price_competitiveness,
        expected_time_to_sell=result.expected_outcome.expected_time_to_sell,
        expected_buyer_interest=result.expected_outcome.expected_buyer_interest,
        risk_level=result.recommendation.risk_level,
        action_type=result.action.action_type,
        action_reason=result.action.action_reason,
        confidence_level=result.expected_outcome.confidence_level,
    )


def generate_listing_source_text(db: Session, listing_id: str) -> str:
    listing = TradeRepository(db).get_listing_or_none(listing_id)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    parts = [
        listing.title,
        listing.item_name,
        listing.brand,
        listing.model,
        listing.category,
        listing.condition_label,
        listing.pickup_area,
        listing.residential_college,
        listing.description,
    ]
    return " | ".join(part for part in parts if part)


def generate_wanted_post_source_text(db: Session, wanted_post_id: str) -> str:
    wanted_post = TradeRepository(db).get_wanted_post_or_none(wanted_post_id)
    if wanted_post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wanted post not found")
    parts = [
        wanted_post.title,
        wanted_post.desired_item_name,
        wanted_post.category,
        wanted_post.preferred_pickup_area,
        wanted_post.residential_college,
        wanted_post.description,
    ]
    return " | ".join(part for part in parts if part)


def create_or_update_listing_embedding(db: Session, listing_id: str):
    source_text = generate_listing_source_text(db, listing_id)
    return TradeRepository(db).upsert_listing_embedding(
        listing_id,
        source_text,
        model_name="demo-hash-embedding-1536",
        embedding_value=make_demo_embedding_text(source_text),
    )


def create_or_update_wanted_post_embedding(db: Session, wanted_post_id: str):
    source_text = generate_wanted_post_source_text(db, wanted_post_id)
    return TradeRepository(db).upsert_wanted_post_embedding(
        wanted_post_id,
        source_text,
        model_name="demo-hash-embedding-1536",
        embedding_value=make_demo_embedding_text(source_text),
    )


def recompute_matches_for_listing(db: Session, listing_id: str) -> list[TradeMatch]:
    repo = TradeRepository(db)
    listing = repo.get_listing_or_none(listing_id)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    pricing = _pricing_decision(listing, list(repo.list_historical_sales_for_category(listing.category)))
    candidates, matches = recommend_buyers_for_listing(
        listing,
        list(repo.list_wanted_posts_by_category(listing.category)),
        pricing,
    )
    for match_values in matches:
        repo.upsert_trade_match(listing.id, match_values.pop("wanted_post_id"), match_values)
    return list(repo.list_matches_for_listing(listing_id))


def build_trade_intelligence_result(
    listing: Listing,
    wanted_posts: list[WantedPost],
    historical_sales: list[HistoricalSale],
    reports_count: int = 0,
    duplicate_image_count: int = 0,
) -> tuple[TradeIntelligenceResult, list[dict], float]:
    pricing = _pricing_decision(listing, historical_sales)
    risk = _risk_decision(listing, pricing, reports_count, duplicate_image_count)
    candidates, match_values = recommend_buyers_for_listing(listing, wanted_posts, pricing)
    recommended_candidates = recommended_match_candidates(candidates)

    top_score = recommended_candidates[0].match_score if recommended_candidates else 0
    interest = _buyer_interest(top_score, len(candidates), pricing, listing)
    expected_time = _expected_time_to_sell(top_score, pricing, listing, risk.risk_level)
    confidence = _confidence_level(pricing.comparable_count, candidates, listing)
    action_type, action_reason = _choose_action(listing, pricing, risk, recommended_candidates)
    sell_fast_price = _money(max(pricing.minimum_price, pricing.suggested_price * 0.92))

    result = TradeIntelligenceResult(
        recommendation={
            "suggested_listing_price": pricing.suggested_price,
            "minimum_acceptable_price": pricing.minimum_price,
            "sell_fast_price": sell_fast_price,
            "risk_score": risk.risk_score,
            "fair_price_range": {"low": pricing.fair_low, "high": pricing.fair_high},
            "risk_level": risk.risk_level,
            "best_match_candidates": recommended_candidates[:3],
        },
        why={
            "similar_item_pattern": pricing.pattern_summary,
            "condition_estimate": _condition_summary(listing),
            "local_demand_context": _demand_context(listing, candidates),
            "price_competitiveness": pricing.price_competitiveness,
            "evidence": _decision_evidence(pricing, risk, len(candidates), duplicate_image_count),
        },
        expected_outcome={
            "expected_time_to_sell": expected_time,
            "expected_buyer_interest": interest,
            "confidence_level": confidence,
            "confidence_factors": _confidence_factors(pricing.comparable_count, recommended_candidates, listing),
        },
        action={
            "action_type": action_type,
            "action_reason": action_reason,
            "next_steps": _next_steps(action_type, pricing, recommended_candidates),
        },
        metadata={
            "provider": "heuristic",
            "model": "deterministic-campus-pricing-v1",
            "used_fallback": False,
            "generated_at": datetime.now(UTC),
            "analysis_mode": "heuristic_text_structured_context",
            "image_analysis_skipped": not bool(listing.images),
            "data_source": "historical_sales_and_wanted_posts",
        },
    )
    return result, match_values, risk.risk_score


def _get_or_create_running_run(repo: TradeRepository, listing: Listing, agent_run_id: str | None) -> AgentRun:
    if agent_run_id:
        existing = repo.get_agent_run_or_none(agent_run_id)
        if existing is not None:
            return existing
    return repo.create_agent_run(
        {
            "agent_name": "trade_intelligence_orchestrator",
            "entity_type": "listing",
            "entity_id": listing.id,
            "status": "running",
            "input_payload": _listing_input_payload(listing),
            "started_at": datetime.now(UTC),
        }
    )


def _pricing_decision(listing: Listing, historical_sales: list[HistoricalSale]) -> PricingDecision:
    comparable_sales = _comparable_sales(listing, historical_sales)
    similar_count = sum(1 for sale, score in comparable_sales if score >= 0.5)
    if comparable_sales:
        adjusted_prices = [_adjust_historical_price_for_listing(sale, listing) for sale, _score in comparable_sales]
        fair_low = _percentile(adjusted_prices, 0.25)
        fair_high = _percentile(adjusted_prices, 0.75)
        base_price = median(adjusted_prices)
        comparable_count = len(adjusted_prices)
    else:
        fair_low, base_price, fair_high = CATEGORY_FALLBACK_PRICES.get(listing.category, (30.0, 60.0, 100.0))
        comparable_count = 0

    location_multiplier = 1.04 if _is_kk_related(listing.pickup_area, listing.residential_college) else 1.0
    timing_multiplier = 1.06 if _has_move_out_context(listing) else 1.0
    suggested = _money(base_price * location_multiplier * timing_multiplier)
    fair_low = _money(fair_low * location_multiplier * timing_multiplier)
    fair_high = _money(max(fair_high * location_multiplier * timing_multiplier, suggested * 1.08))
    minimum = _money(max(fair_low * 0.82, suggested * 0.78))

    item = listing.item_name or listing.title
    if comparable_count:
        pattern = (
            f"{comparable_count} historical {listing.category.replace('_', ' ')} sale(s), "
            f"including {similar_count} close {item} comparable(s), point to a fair range of "
            f"RM{fair_low:.0f}-RM{fair_high:.0f}."
        )
        if timing_multiplier > 1:
            pattern += " Move-out timing adds a small demand premium for fast campus resale."
    else:
        pattern = (
            f"No close historical sale exists yet, so the engine uses the campus fallback band "
            f"for {listing.category.replace('_', ' ')} and keeps confidence lower."
        )

    return PricingDecision(
        fair_low=fair_low,
        fair_high=fair_high,
        suggested_price=suggested,
        minimum_price=minimum,
        comparable_count=comparable_count,
        similar_count=similar_count,
        pattern_summary=pattern,
        price_competitiveness=_price_competitiveness(listing, fair_low, fair_high, suggested),
    )


def _comparable_sales(listing: Listing, historical_sales: list[HistoricalSale]) -> list[tuple[HistoricalSale, float]]:
    listing_tokens = _tokens(" ".join(filter(None, [listing.item_name, listing.title, listing.brand, listing.model])))
    scored: list[tuple[HistoricalSale, float]] = []
    for sale in historical_sales:
        sale_tokens = _tokens(sale.item_name)
        overlap = len(listing_tokens & sale_tokens) / max(len(listing_tokens | sale_tokens), 1)
        score = overlap
        if listing.item_name and listing.item_name.lower() == sale.item_name.lower():
            score += 0.7
        if listing.condition_label and sale.condition_label and _normalize_condition(listing.condition_label) == _normalize_condition(sale.condition_label):
            score += 0.12
        if _same_location_context(listing.pickup_area, listing.residential_college, sale.location, sale.residential_college):
            score += 0.12
        scored.append((sale, score))

    close = [(sale, score) for sale, score in scored if score >= 0.25]
    if close:
        return sorted(close, key=lambda item: item[1], reverse=True)[:12]
    return sorted(scored, key=lambda item: item[1], reverse=True)[:8]


def _adjust_historical_price_for_listing(sale: HistoricalSale, listing: Listing) -> float:
    sale_condition = _condition_multiplier(sale.condition_label)
    listing_condition = _condition_multiplier(listing.condition_label)
    price = float(sale.sold_price) * (listing_condition / max(sale_condition, 0.1))
    if _same_location_context(listing.pickup_area, listing.residential_college, sale.location, sale.residential_college):
        price *= 1.02
    if sale.sold_at:
        sold_at = sale.sold_at if sale.sold_at.tzinfo else sale.sold_at.replace(tzinfo=UTC)
        age_days = max((datetime.now(UTC) - sold_at).days, 0)
        if age_days <= 21:
            price *= 1.03
        elif age_days > 180:
            price *= 0.96
    return price


def _risk_decision(
    listing: Listing,
    pricing: PricingDecision,
    reports_count: int,
    duplicate_image_count: int = 0,
) -> RiskDecision:
    text = f"{listing.title} {listing.description or ''} {listing.condition_label or ''}".lower()
    risk_score = 8.0
    reasons: list[str] = []

    matched_keywords = [keyword for keyword in SUSPICIOUS_KEYWORDS if keyword in text]
    if matched_keywords:
        risk_score += 48
        reasons.append(f"suspicious wording: {', '.join(sorted(matched_keywords)[:3])}")
    if not listing.description or len(listing.description.strip()) < 35:
        risk_score += 14
        reasons.append("thin description")
    if not listing.images:
        risk_score += 12
        reasons.append("no image metadata")
    if reports_count:
        risk_score += min(reports_count * 18, 42)
        reasons.append(f"{reports_count} user report(s)")
    if duplicate_image_count:
        risk_score += min(duplicate_image_count * 20, 36)
        reasons.append("duplicated image hash")
    if any(term in text for term in {"replica", "fake", "counterfeit"}):
        risk_score += 18
        reasons.append("counterfeit/prohibited wording")
    if any(term in text for term in {"icloud locked", "password locked", "locked ipad", "locked iphone"}):
        risk_score += 18
        reasons.append("locked-device wording")

    price = float(listing.price)
    if price < pricing.fair_low * 0.68:
        risk_score += 26
        reasons.append("price far below comparable range")
    elif price > pricing.fair_high * 1.45:
        risk_score += 22
        reasons.append("price far above comparable range")

    risk_score = min(risk_score, 100.0)
    if risk_score >= 65:
        return RiskDecision(risk_score, "high", "High risk because " + ", ".join(reasons) + ".")
    if risk_score >= 35:
        return RiskDecision(risk_score, "medium", "Medium risk because " + ", ".join(reasons) + ".")
    return RiskDecision(risk_score, "low", "Low risk: price, description, and trust signals are broadly consistent.")


def _condition_summary(listing: Listing) -> str:
    text = f"{listing.condition_label or ''} {listing.description or ''}".lower()
    if any(keyword in text for keyword in POOR_CONDITION_KEYWORDS):
        return "Below-average condition: description includes wear, damage, or functionality concerns."
    if any(keyword in text for keyword in GOOD_CONDITION_KEYWORDS):
        return "Above-average used condition: description includes positive signals such as works well or minor scratches."
    if "new" in text:
        return "Near-new condition based on seller-provided wording."
    if listing.condition_label:
        return f"Condition is treated as {listing.condition_label.lower()} based on the seller label."
    return "Condition confidence is limited because the listing gives little condition detail."


def _price_competitiveness(listing: Listing, fair_low: float, fair_high: float, suggested: float) -> str:
    price = float(listing.price)
    if price < fair_low * 0.82:
        return "Current price is unusually low against comparable sales; this may sell fast but raises trust questions."
    if price < suggested * 0.95:
        return "Current price is below the suggested price and competitive for a faster sale."
    if price <= fair_high:
        return "Current price sits inside the fair comparable range."
    if price <= fair_high * 1.2:
        return "Current price is slightly above the fair range and may slow conversion."
    return "Current price is well above comparable sales and should be revised for fairness."


def _demand_context(listing: Listing, candidates: list[MatchCandidate]) -> str:
    if candidates:
        strong = sum(1 for candidate in candidates if candidate.match_score >= 78)
        location = f" around {listing.pickup_area}" if listing.pickup_area else ""
        return f"{len(candidates)} same-category wanted post(s){location}, including {strong} strong match(es), indicate measurable local demand."
    if listing.pickup_area:
        return f"No direct wanted post is available yet, but {listing.pickup_area} pickup keeps the item discoverable for campus buyers."
    return "No direct wanted post is available yet, so demand confidence depends on listing clarity and price."


def _buyer_interest(top_score: float, candidate_count: int, pricing: PricingDecision, listing: Listing) -> str:
    if top_score >= 82 and float(listing.price) <= pricing.fair_high:
        return "high"
    if candidate_count >= 2 or top_score >= 62:
        return "moderate"
    return "low"


def _expected_time_to_sell(top_score: float, pricing: PricingDecision, listing: Listing, risk_level: str) -> str:
    price = float(listing.price)
    if risk_level == "high":
        return "review required before promotion"
    if top_score >= 82 and price <= pricing.fair_high:
        return "1-3 days"
    if top_score >= 65 and price <= pricing.fair_high * 1.12:
        return "3-6 days"
    if price > pricing.fair_high * 1.2:
        return "1-2 weeks unless price is revised"
    return "5-10 days"


def _confidence_level(comparable_count: int, candidates: list[MatchCandidate], listing: Listing) -> str:
    score = 0
    if comparable_count >= 5:
        score += 2
    elif comparable_count >= 2:
        score += 1
    if candidates and candidates[0].match_score >= 78:
        score += 2
    elif candidates:
        score += 1
    if listing.item_name and listing.condition_label and listing.description and len(listing.description) >= 35:
        score += 1
    if score >= 4:
        return "high"
    if score >= 2:
        return "medium"
    return "low"


def _choose_action(
    listing: Listing,
    pricing: PricingDecision,
    risk: RiskDecision,
    candidates: list[MatchCandidate],
) -> tuple[str, str]:
    price = float(listing.price)
    if risk.risk_level == "high":
        return "flag_for_review", risk.summary
    if not listing.images:
        return "upload_better_image", "Upload at least one clear item image to improve trust and increase buyer response."
    if price < pricing.fair_low * 0.85 or price > pricing.fair_high * 1.12:
        return "revise_price", f"Revise toward RM{pricing.suggested_price:.0f}; the current price is outside the fair comparable band."
    if candidates and candidates[0].match_score >= 78:
        return "match_with_buyers", f"Contact the top buyer first; the best match has {candidates[0].final_match_confidence} confidence."
    return "list_now", "The listing is fairly priced and clear enough to publish now."


def _match_values_from_result_candidates(candidates: list[MatchCandidate], fallback_matches: list[dict]) -> list[dict]:
    fallback_by_id = {values["wanted_post_id"]: values for values in fallback_matches}
    selected: list[dict] = []
    if candidates:
        for candidate in candidates:
            fallback = fallback_by_id.get(candidate.wanted_post_id)
            if fallback is None:
                continue
            selected.append(
                {
                    **fallback,
                    "match_score": Decimal(str(candidate.match_score)),
                    "price_fit_score": Decimal(str(candidate.price_fit_score or 0)),
                    "location_fit_score": Decimal(str(candidate.location_fit_score or 0)),
                    "semantic_fit_score": Decimal(str(candidate.semantic_fit_score or 0)),
                    "explanation": candidate.explanation,
                }
            )
    return selected or [dict(values) for values in fallback_matches]


def _risk_score_for_decision(risk_level: str, model_score: float | None, heuristic_score: float) -> float:
    if model_score is not None:
        score = float(model_score)
    else:
        score = float(heuristic_score)
    if risk_level == "high":
        return round(max(score, 75.0), 2)
    if risk_level == "medium":
        return round(min(max(score, 40.0), 74.0), 2)
    return round(min(score, 34.0), 2)


def _risk_evidence_payload(
    result: TradeIntelligenceResult,
    risk_score: float,
    duplicate_image_count: int,
) -> dict:
    return {
        "risk_score": risk_score,
        "risk_level": result.recommendation.risk_level,
        "evidence": result.why.evidence,
        "duplicate_image_count": duplicate_image_count,
        "recommended_action": result.action.action_type,
        "generated_at": result.metadata.generated_at.isoformat() if result.metadata.generated_at else None,
        "used_fallback": result.metadata.used_fallback,
        "analysis_mode": result.metadata.analysis_mode,
        "image_analysis_skipped": result.metadata.image_analysis_skipped,
        "data_source": result.metadata.data_source,
    }


def _mark_fallback_result(result: TradeIntelligenceResult, error_message: str) -> TradeIntelligenceResult:
    data = result.model_dump(mode="json")
    evidence = data.setdefault("why", {}).setdefault("evidence", [])
    evidence.append("Provider fallback: GLM provider was unavailable, so deterministic campus heuristics were used.")
    data["metadata"] = {
        "provider": "heuristic",
        "model": "deterministic-campus-pricing-v1",
        "used_fallback": True,
        "generated_at": datetime.now(UTC).isoformat(),
        "analysis_mode": "deterministic_fallback",
        "image_analysis_skipped": True,
        "data_source": "heuristic_resale_context",
    }
    data.setdefault("action", {}).setdefault("next_steps", [])
    data["action"]["next_steps"].append("Review the recommendation once the GLM provider is available again.")
    data["provider_error"] = error_message
    return TradeIntelligenceResult.model_validate(data)


def _ai_limit_denial(repo: TradeRepository, current_user: User, *, feature: str) -> str | None:
    settings = get_settings()
    if not settings.ai_trade_enabled:
        return "AI_TRADE_ENABLED is false."

    day_start = datetime.now(UTC) - timedelta(days=1)
    global_count = repo.count_ai_usage_logs(statuses=("succeeded", "failed"), since=day_start)
    if global_count >= settings.ai_global_daily_limit:
        return "Global AI daily limit reached."

    role = getattr(getattr(current_user, "profile", None), "app_role", AppRole.STUDENT)
    user_limit = settings.ai_staff_daily_limit if role in {AppRole.MODERATOR, AppRole.ADMIN} else settings.ai_student_daily_limit
    user_count = repo.count_ai_usage_logs(
        feature=feature,
        user_id=current_user.id,
        statuses=("succeeded", "failed"),
        since=day_start,
    )
    if user_count >= user_limit:
        return "User AI daily limit reached."
    return None


def _log_ai_usage(
    repo: TradeRepository,
    current_user: User,
    *,
    feature: str,
    request_status: str,
    provider: str | None = None,
    model: str | None = None,
    error_message: str | None = None,
) -> None:
    repo.create_ai_usage_log(
        {
            "user_id": current_user.id,
            "feature": feature,
            "provider": provider,
            "model": model,
            "request_status": request_status,
            "error_message": error_message,
        }
    )


def _decision_evidence(
    pricing: PricingDecision,
    risk: RiskDecision,
    candidate_count: int,
    duplicate_image_count: int,
) -> list[str]:
    evidence = [
        f"{pricing.comparable_count} comparable sale(s) evaluated; {pricing.similar_count} close item match(es).",
        f"Fair range RM{pricing.fair_low:.0f}-RM{pricing.fair_high:.0f}; suggested RM{pricing.suggested_price:.0f}.",
        f"{candidate_count} same-category wanted post(s) scored for price, item, urgency, and location fit.",
        f"Risk score {risk.risk_score:.0f}/100: {risk.summary}",
    ]
    if duplicate_image_count:
        evidence.append(f"{duplicate_image_count} duplicate image hash signal(s) found across other listings.")
    return evidence


def _confidence_factors(comparable_count: int, candidates: list[MatchCandidate], listing: Listing) -> list[str]:
    factors: list[str] = []
    factors.append("Strong comparable history" if comparable_count >= 5 else "Limited comparable history")
    factors.append("Strong buyer demand signal" if candidates else "No strong buyer match yet")
    factors.append("Listing has enough item detail" if listing.description and len(listing.description) >= 35 else "Listing detail is thin")
    if listing.images:
        factors.append("Image metadata is present")
    else:
        factors.append("No image metadata is present")
    return factors


def _next_steps(action_type: str, pricing: PricingDecision, candidates: list[MatchCandidate]) -> list[str]:
    if action_type == "flag_for_review":
        return ["Pause promotion until a moderator reviews trust signals.", "Ask the seller for proof of ownership if needed."]
    if action_type == "upload_better_image":
        return ["Upload at least one clear photo from multiple angles.", "Run enrichment again after images are available."]
    if action_type == "revise_price":
        return [f"Update listing price near RM{pricing.suggested_price:.0f}.", f"Use RM{pricing.minimum_price:.0f} as the negotiation floor."]
    if action_type == "match_with_buyers" and candidates:
        return [f"Contact {candidates[0].title} first.", "Keep the listing active until a buyer confirms pickup."]
    return ["Publish or keep the listing active.", "Monitor buyer interest and rerun analysis if demand changes."]


def _has_move_out_context(listing: Listing) -> bool:
    text = f"{listing.title} {listing.description or ''}".lower()
    return any(term in text for term in ("move-out", "move out", "moving out", "move-in", "move in", "semester end"))


def _tokens(value: str) -> set[str]:
    return {token for token in findall(r"[a-z0-9]+", value.lower()) if len(token) > 2 and token not in PRICING_STOPWORDS}


def _condition_multiplier(condition_label: str | None) -> float:
    normalized = _normalize_condition(condition_label)
    return CONDITION_MULTIPLIERS.get(normalized, 0.9)


def _normalize_condition(condition_label: str | None) -> str:
    text = (condition_label or "unknown").strip().lower().replace("_", " ")
    if "like" in text and "new" in text:
        return "like new"
    if "excellent" in text:
        return "excellent"
    if "good" in text:
        return "good"
    if "fair" in text:
        return "fair"
    if "poor" in text or "broken" in text or "damaged" in text:
        return "poor"
    if "new" in text:
        return "new"
    if "used" in text:
        return "used"
    return "unknown"


def _same_location_context(
    listing_area: str | None,
    listing_college: str | None,
    sale_area: str | None,
    sale_college: str | None,
) -> bool:
    if listing_area and sale_area and listing_area == sale_area:
        return True
    if listing_college and sale_college and listing_college.lower() == sale_college.lower():
        return True
    return _is_kk_related(listing_area, listing_college) and _is_kk_related(sale_area, sale_college)


def _is_kk_related(area: str | None, college: str | None) -> bool:
    return (area or "").upper() == "KK" or (college or "").upper().startswith("KK")


def _listing_input_payload(listing: Listing) -> dict:
    return {
        "listing_id": listing.id,
        "title": listing.title,
        "description": listing.description,
        "category": listing.category,
        "item_name": listing.item_name,
        "condition_label": listing.condition_label,
        "price": float(listing.price),
        "pickup_area": listing.pickup_area,
    }


def _percentile(values: list[float], percentile: float) -> float:
    if not values:
        return 0.0
    sorted_values = sorted(values)
    index = max(0, min(len(sorted_values) - 1, ceil(percentile * len(sorted_values)) - 1))
    return sorted_values[index]


def _money(value: float) -> float:
    return float(Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
