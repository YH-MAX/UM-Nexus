from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal, ROUND_HALF_UP
from math import ceil
from re import findall
from statistics import median

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.integrations.glm_client import GLMProviderError
from app.models import AgentRun, HistoricalSale, Listing, TradeMatch, WantedPost
from app.models.user import User
from app.repositories.trade import TradeRepository
from app.schemas.trade_intelligence import (
    EnrichListingAccepted,
    MatchCandidate,
    TradeIntelligenceResult,
    TradeIntelligenceResultStatus,
)
from app.services.embedding_service import make_demo_embedding_text
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
URGENCY_KEYWORDS = {"urgent", "asap", "today", "tomorrow", "exam", "move-in", "move out", "this week", "needed soon"}
STOPWORDS = {
    "the",
    "and",
    "for",
    "with",
    "want",
    "need",
    "used",
    "item",
    "good",
    "condition",
    "looking",
    "searching",
    "near",
    "prefer",
}

CATEGORY_FALLBACK_PRICES = {
    "textbooks": (28.0, 42.0, 58.0),
    "electronics": (60.0, 120.0, 220.0),
    "small_appliances": (45.0, 95.0, 180.0),
    "dorm_essentials": (18.0, 35.0, 70.0),
}
MIN_SUGGESTED_MATCH_SCORE = 58.0
MIN_RECOMMENDED_MATCH_SCORE = 74.0
MIN_RECOMMENDED_ITEM_FIT_SCORE = 58.0
CONDITION_MULTIPLIERS = {
    "new": 1.18,
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
        return result
    except Exception as exc:
        repo.update_agent_run(
            agent_run,
            {"status": "failed", "finished_at": datetime.now(UTC), "error_message": str(exc)},
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


def list_matches_for_listing(db: Session, listing_id: str) -> list[TradeMatch]:
    repo = TradeRepository(db)
    listing = repo.get_listing_or_none(listing_id)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    return list(repo.list_matches_for_listing(listing_id))


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
    candidates, matches = _score_matches(listing, list(repo.list_wanted_posts_by_category(listing.category)), pricing)
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
    candidates, match_values = _score_matches(listing, wanted_posts, pricing)
    recommended_candidates = _recommended_candidates(candidates)

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


def _score_matches(
    listing: Listing,
    wanted_posts: list[WantedPost],
    pricing: PricingDecision,
) -> tuple[list[MatchCandidate], list[dict]]:
    candidates: list[MatchCandidate] = []
    match_values: list[dict] = []
    for wanted_post in wanted_posts:
        category_fit = 100.0 if wanted_post.category == listing.category else 0.0
        item_fit = _semantic_fit_score(listing, wanted_post)
        price_fit = _price_fit_score(float(listing.price), float(wanted_post.max_budget) if wanted_post.max_budget else None)
        location_fit = _location_fit_score(listing, wanted_post)
        urgency_fit = _urgency_score(wanted_post)
        match_score = round(
            category_fit * 0.10 + item_fit * 0.34 + price_fit * 0.25 + location_fit * 0.23 + urgency_fit * 0.08,
            2,
        )
        confidence = _match_confidence(match_score)
        price_summary = _price_fit_summary(listing, wanted_post, price_fit, pricing)
        location_summary = _location_fit_summary(listing, wanted_post, location_fit)
        item_summary = _item_fit_summary(listing, wanted_post, item_fit)
        explanation = (
            f"Item fit: {item_summary} Price fit: {price_summary} "
            f"Location fit: {location_summary} Final confidence: {confidence} ({match_score:.0f}%)."
        )
        candidate = MatchCandidate(
            wanted_post_id=wanted_post.id,
            title=wanted_post.title,
            match_score=match_score,
            price_fit_score=price_fit,
            location_fit_score=location_fit,
            semantic_fit_score=item_fit,
            explanation=explanation,
            price_fit_summary=price_summary,
            location_fit_summary=location_summary,
            item_fit_summary=item_summary,
            final_match_confidence=confidence,
            max_budget=float(wanted_post.max_budget) if wanted_post.max_budget else None,
            preferred_pickup_area=wanted_post.preferred_pickup_area,
        )
        candidates.append(candidate)
        if match_score >= MIN_SUGGESTED_MATCH_SCORE:
            match_values.append(
                {
                    "wanted_post_id": wanted_post.id,
                    "match_score": Decimal(str(match_score)),
                    "price_fit_score": Decimal(str(price_fit)),
                    "location_fit_score": Decimal(str(location_fit)),
                    "semantic_fit_score": Decimal(str(item_fit)),
                    "status": "suggested",
                    "explanation": explanation,
                }
            )

    candidates.sort(key=lambda candidate: candidate.match_score, reverse=True)
    match_values.sort(key=lambda values: values["match_score"], reverse=True)
    return candidates, match_values


def _recommended_candidates(candidates: list[MatchCandidate]) -> list[MatchCandidate]:
    return [
        candidate
        for candidate in candidates
        if candidate.match_score >= MIN_RECOMMENDED_MATCH_SCORE
        and (candidate.semantic_fit_score or 0) >= MIN_RECOMMENDED_ITEM_FIT_SCORE
    ]


def _price_fit_score(price: float, max_budget: float | None) -> float:
    if max_budget is None:
        return 68.0
    if price <= max_budget:
        return 100.0
    ratio = price / max_budget
    if ratio <= 1.10:
        return 82.0
    if ratio <= 1.25:
        return 55.0
    if ratio <= 1.50:
        return 30.0
    return 10.0


def _location_fit_score(listing: Listing, wanted_post: WantedPost) -> float:
    if listing.pickup_area and wanted_post.preferred_pickup_area and listing.pickup_area == wanted_post.preferred_pickup_area:
        return 100.0
    if (
        listing.residential_college
        and wanted_post.residential_college
        and listing.residential_college.lower() == wanted_post.residential_college.lower()
    ):
        return 92.0
    if _is_kk_related(listing.pickup_area, listing.residential_college) and _is_kk_related(
        wanted_post.preferred_pickup_area,
        wanted_post.residential_college,
    ):
        return 88.0
    if not listing.pickup_area or not wanted_post.preferred_pickup_area:
        return 62.0
    if "other" in {listing.pickup_area, wanted_post.preferred_pickup_area}:
        return 45.0
    return 66.0


def _semantic_fit_score(listing: Listing, wanted_post: WantedPost) -> float:
    listing_tokens = _tokens(" ".join(filter(None, [listing.title, listing.item_name, listing.brand, listing.model, listing.description])))
    wanted_tokens = _tokens(" ".join(filter(None, [wanted_post.title, wanted_post.desired_item_name, wanted_post.description])))
    if not listing_tokens or not wanted_tokens:
        return 55.0
    overlap = len(listing_tokens & wanted_tokens) / max(len(wanted_tokens), 1)
    score = 42 + overlap * 58
    if listing.item_name and wanted_post.desired_item_name and _tokens(listing.item_name) & _tokens(wanted_post.desired_item_name):
        score += 18
    return round(min(score, 100.0), 2)


def _urgency_score(wanted_post: WantedPost) -> float:
    text = f"{wanted_post.title} {wanted_post.description or ''}".lower()
    return 100.0 if any(keyword in text for keyword in URGENCY_KEYWORDS) else 55.0


def _price_fit_summary(listing: Listing, wanted_post: WantedPost, score: float, pricing: PricingDecision) -> str:
    if wanted_post.max_budget is None:
        return "Buyer did not set a budget, so price fit is moderate."
    if float(listing.price) <= float(wanted_post.max_budget):
        return f"Listing price is within the buyer's RM{float(wanted_post.max_budget):.0f} budget."
    if score >= 55:
        return "Listing is slightly above budget but still close enough for negotiation."
    return "Listing is meaningfully above the buyer budget and may need a price revision."


def _location_fit_summary(listing: Listing, wanted_post: WantedPost, score: float) -> str:
    if score >= 95:
        return f"Both sides prefer {listing.pickup_area}, making pickup highly convenient."
    if score >= 85:
        return "Both sides are in a KK-related location, so handoff friction is low."
    if score >= 60:
        return "Pickup locations are workable but not an exact match."
    return "Pickup preferences are weakly aligned."


def _item_fit_summary(listing: Listing, wanted_post: WantedPost, score: float) -> str:
    if score >= 85:
        return "Wanted wording closely matches the listing title and item details."
    if score >= 65:
        return "Wanted wording partially matches the listing item and category."
    return "Category matches, but item wording is broad or uncertain."


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
    }
    data.setdefault("action", {}).setdefault("next_steps", [])
    data["action"]["next_steps"].append("Review the recommendation once the GLM provider is available again.")
    data["provider_error"] = error_message
    return TradeIntelligenceResult.model_validate(data)


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


def _match_confidence(score: float) -> str:
    if score >= 84:
        return "very high"
    if score >= 74:
        return "high"
    if score >= 58:
        return "medium"
    return "low"


def _tokens(value: str) -> set[str]:
    return {token for token in findall(r"[a-z0-9]+", value.lower()) if len(token) > 2 and token not in STOPWORDS}


def _has_move_out_context(listing: Listing) -> bool:
    text = f"{listing.title} {listing.description or ''}".lower()
    return any(term in text for term in ("move-out", "move out", "moving out", "move-in", "move in", "semester end"))


def _condition_multiplier(condition_label: str | None) -> float:
    normalized = _normalize_condition(condition_label)
    return CONDITION_MULTIPLIERS.get(normalized, 0.9)


def _normalize_condition(condition_label: str | None) -> str:
    text = (condition_label or "unknown").strip().lower()
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
