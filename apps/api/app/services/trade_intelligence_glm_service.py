from __future__ import annotations

from copy import deepcopy
import json
from datetime import UTC, datetime
from typing import Any

from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.integrations.glm_client import (
    GLMDecisionClient,
    GLMProviderError,
    collect_public_image_urls,
    get_glm_client,
)
from app.models import HistoricalSale, Listing, WantedPost
from app.repositories.trade import TradeRepository
from app.schemas.trade_intelligence import TradeIntelligenceResult
from app.services.embedding_service import cosine_similarity, make_demo_embedding, parse_embedding_text
from app.trade.constants import RISK_LEVELS, TRADE_ACTION_TYPES


TRADE_ANALYSIS_PROMPT = """\
You are UM Nexus Trade Intelligence, a GLM-centered multimodal decision engine for University of Malaya campus resale.

Analyze the seller's listing using:
- public HTTPS image references, if provided
- title and description
- category and condition label
- pickup area and residential college
- historical campus comparable sales
- candidate wanted posts and retrieved similar examples
- current risk signals, including reports, missing images, unusual price positioning, and suspicious wording

Return only valid JSON. Do not include markdown fences or commentary.

The JSON must follow this normalized shape:
{
  "recommendation": {
    "suggested_listing_price": number,
    "minimum_acceptable_price": number,
    "risk_level": "low" | "medium" | "high",
    "best_match_candidates": [...]
  },
  "why": {
    "similar_item_pattern": string,
    "condition_estimate": string,
    "local_demand_context": string,
    "price_competitiveness": string
  },
  "expected_outcome": {
    "expected_time_to_sell": string,
    "expected_buyer_interest": string,
    "confidence_level": string
  },
  "action": {
    "action_type": "list_now" | "revise_price" | "upload_better_image" | "match_with_buyers" | "flag_for_review",
    "action_reason": string
  }
}

Reason like a campus resale analyst. Prefer fair, fast, safe transactions over pure seller revenue.
Use the images and text together to infer likely item type and condition. If image analysis is unavailable,
state the uncertainty in condition_estimate and rely on text plus structured campus context.
"""


class TradeIntelligenceGLMService:
    def __init__(self, db: Session, client: GLMDecisionClient | None = None) -> None:
        self.db = db
        self.client = client or get_glm_client()

    def analyze_listing(
        self,
        listing: Listing,
        historical_sales: list[HistoricalSale],
        wanted_posts: list[WantedPost],
        fallback_result: TradeIntelligenceResult,
    ) -> TradeIntelligenceResult:
        payload = build_multimodal_glm_payload(self.db, listing, historical_sales, wanted_posts, fallback_result)
        return self.generate_result_from_payload(payload)

    def generate_result_from_payload(self, payload: dict[str, Any]) -> TradeIntelligenceResult:
        payload = dict(payload)
        payload["prompt"] = build_trade_analysis_prompt(payload)
        try:
            raw_result = self.client.generate_trade_decision(payload)
            normalized = normalize_trade_decision(raw_result, payload.get("fallback_result") or {})
            normalized["metadata"] = {
                **(normalized.get("metadata") or {}),
                "provider": _provider_name(self.client),
                "model": getattr(self.client, "model_name", None),
                "used_fallback": False,
                "generated_at": datetime.now(UTC).isoformat(),
            }
            return TradeIntelligenceResult.model_validate(normalized)
        except ValidationError as exc:
            raise GLMProviderError("GLM decision payload failed normalized schema validation.") from exc
        except (TypeError, ValueError) as exc:
            raise GLMProviderError("GLM decision payload could not be normalized.") from exc


def build_multimodal_glm_payload(
    db: Session,
    listing: Listing,
    historical_sales: list[HistoricalSale],
    wanted_posts: list[WantedPost],
    fallback_result: TradeIntelligenceResult,
) -> dict[str, Any]:
    repo = TradeRepository(db)
    retrieved = retrieve_similar_examples(db, listing)
    image_references = [
        {
            "storage_path": image.storage_path,
            "public_url": image.public_url,
            "is_primary": image.is_primary,
        }
        for image in listing.images
    ]
    valid_public_image_urls = collect_public_image_urls(image_references)
    reports_count = repo.count_listing_reports(listing.id)
    duplicate_image_count = repo.count_duplicate_image_hashes(listing.id)
    return {
        "listing": {
            "id": listing.id,
            "title": listing.title,
            "description": listing.description,
            "category": listing.category,
            "item_name": listing.item_name,
            "brand": listing.brand,
            "model": listing.model,
            "condition_label": listing.condition_label,
            "price": float(listing.price),
            "currency": listing.currency,
            "pickup_area": listing.pickup_area,
            "residential_college": listing.residential_college,
            "created_at": listing.created_at.isoformat() if listing.created_at else None,
        },
        "image_references": image_references,
        "structured_context": {
            "location_context": _location_context(listing),
            "listing_age_hours": _listing_age_hours(listing),
            "reports_count": reports_count,
            "duplicate_image_count": duplicate_image_count,
            "campus": "University of Malaya",
            "image_analysis": {
                "mode": "multimodal" if valid_public_image_urls else "text_only",
                "valid_public_image_count": len(valid_public_image_urls),
                "skipped_image_count": max(
                    len([image for image in image_references if image.get("public_url")])
                    - len(valid_public_image_urls),
                    0,
                ),
                "note": (
                    "Image URLs were passed as public HTTPS references."
                    if valid_public_image_urls
                    else "No valid public HTTPS image URL was available; GLM should analyze text and structured context only."
                ),
            },
            "risk_signals": _risk_signal_summary(listing, fallback_result, reports_count, duplicate_image_count),
        },
        "comparable_sales": [_sale_summary(sale) for sale in historical_sales[:12]],
        "candidate_wanted_posts": [_wanted_summary(wanted_post) for wanted_post in wanted_posts[:12]],
        "retrieved_examples": retrieved,
        "fallback_result": fallback_result.model_dump(mode="json"),
    }


def generate_glm_trade_result(
    payload: dict[str, Any],
    client: GLMDecisionClient | None = None,
) -> TradeIntelligenceResult:
    service = TradeIntelligenceGLMService(db=None, client=client)  # type: ignore[arg-type]
    return service.generate_result_from_payload(payload)


def build_trade_analysis_prompt(payload: dict[str, Any]) -> str:
    public_image_urls = collect_public_image_urls(payload.get("image_references") or [])
    structured_context = payload.get("structured_context") or {}
    safe_payload = {
        "listing": payload.get("listing"),
        "structured_context": structured_context,
        "image_references": [{"public_url": image_url} for image_url in public_image_urls],
        "image_analysis": structured_context.get("image_analysis"),
        "comparable_sales_summary": payload.get("comparable_sales"),
        "candidate_matches_summary": payload.get("candidate_wanted_posts"),
        "retrieved_examples": payload.get("retrieved_examples"),
        "fallback_decision_to_improve": payload.get("fallback_result"),
    }
    return f"{TRADE_ANALYSIS_PROMPT}\n\nContext JSON:\n{json.dumps(safe_payload, default=str)}"


def normalize_trade_decision(raw_result: dict[str, Any], fallback_result: dict[str, Any]) -> dict[str, Any]:
    normalized = _default_trade_decision()
    if isinstance(fallback_result, dict):
        normalized = _deep_merge(normalized, deepcopy(fallback_result))
    if not isinstance(raw_result, dict):
        raise ValueError("GLM result must be a JSON object.")
    raw_recommendation = raw_result.get("recommendation")
    raw_risk_level_supplied = isinstance(raw_recommendation, dict) and raw_recommendation.get("risk_level") is not None
    raw_risk_score_supplied = isinstance(raw_recommendation, dict) and raw_recommendation.get("risk_score") is not None

    for block_name in ("why", "expected_outcome", "action"):
        raw_block = raw_result.get(block_name)
        if isinstance(raw_block, dict):
            normalized.setdefault(block_name, {})
            for key, value in raw_block.items():
                if value is not None:
                    normalized[block_name][key] = value

    if isinstance(raw_recommendation, dict):
        normalized.setdefault("recommendation", {})
        for key in (
            "suggested_listing_price",
            "minimum_acceptable_price",
            "sell_fast_price",
            "risk_score",
            "fair_price_range",
            "risk_level",
        ):
            if raw_recommendation.get(key) is not None:
                normalized["recommendation"][key] = raw_recommendation[key]

        if isinstance(raw_recommendation.get("best_match_candidates"), list):
            normalized["recommendation"]["best_match_candidates"] = _normalize_match_candidates(
                raw_recommendation["best_match_candidates"],
                normalized["recommendation"].get("best_match_candidates") or [],
            )

    if normalized.get("recommendation", {}).get("fair_price_range") is None:
        suggested = float(normalized["recommendation"]["suggested_listing_price"])
        normalized["recommendation"]["fair_price_range"] = {
            "low": round(suggested * 0.88, 2),
            "high": round(suggested * 1.12, 2),
        }

    recommendation = normalized.setdefault("recommendation", {})
    recommendation["suggested_listing_price"] = _coerce_number(
        recommendation.get("suggested_listing_price"),
        0.0,
    )
    recommendation["minimum_acceptable_price"] = _coerce_number(
        recommendation.get("minimum_acceptable_price"),
        max(recommendation["suggested_listing_price"] * 0.78, 0.0),
    )
    recommendation["sell_fast_price"] = _coerce_number(
        recommendation.get("sell_fast_price"),
        max(recommendation["minimum_acceptable_price"], recommendation["suggested_listing_price"] * 0.92),
    )
    recommendation["risk_level"] = _normalize_choice(
        recommendation.get("risk_level"),
        RISK_LEVELS,
        "low",
    )
    default_risk_score = _default_risk_score_for_level(recommendation["risk_level"])
    if raw_risk_level_supplied and not raw_risk_score_supplied:
        recommendation["risk_score"] = default_risk_score
    else:
        recommendation["risk_score"] = _coerce_number(recommendation.get("risk_score"), default_risk_score)
    recommendation["risk_score"] = _align_risk_score(recommendation["risk_level"], recommendation["risk_score"])
    recommendation["best_match_candidates"] = recommendation.get("best_match_candidates") or []
    fair_range = recommendation.get("fair_price_range")
    if not isinstance(fair_range, dict):
        suggested = recommendation["suggested_listing_price"]
        fair_range = {"low": round(suggested * 0.88, 2), "high": round(suggested * 1.12, 2)}
    fair_range["low"] = _coerce_number(fair_range.get("low"), round(recommendation["suggested_listing_price"] * 0.88, 2))
    fair_range["high"] = _coerce_number(fair_range.get("high"), round(recommendation["suggested_listing_price"] * 1.12, 2))
    recommendation["fair_price_range"] = fair_range

    action = normalized.setdefault("action", {})
    action["action_type"] = _normalize_choice(
        action.get("action_type"),
        TRADE_ACTION_TYPES,
        "list_now",
    )
    action["action_reason"] = str(action.get("action_reason") or "The listing is ready for a campus resale decision.")
    action["next_steps"] = [str(item) for item in action.get("next_steps") or [] if item is not None]

    why = normalized.setdefault("why", {})
    why.setdefault("similar_item_pattern", "Comparable evidence was limited, so the system used available campus context.")
    why.setdefault("condition_estimate", "Condition confidence is limited by the available listing details.")
    why.setdefault("local_demand_context", "Demand confidence is based on available wanted posts and campus location context.")
    why.setdefault("price_competitiveness", "Price competitiveness was normalized against the available fair-price signal.")
    why["evidence"] = [str(item) for item in why.get("evidence") or [] if item is not None]

    expected = normalized.setdefault("expected_outcome", {})
    expected.setdefault("expected_time_to_sell", "5-10 days")
    expected.setdefault("expected_buyer_interest", "moderate")
    expected.setdefault("confidence_level", "medium")
    expected["confidence_factors"] = [str(item) for item in expected.get("confidence_factors") or [] if item is not None]

    metadata = normalized.setdefault("metadata", {})
    metadata.setdefault("provider", "glm")
    metadata.setdefault("model", None)
    metadata.setdefault("used_fallback", False)
    metadata.setdefault("generated_at", datetime.now(UTC).isoformat())

    return normalized


def _normalize_match_candidates(raw_candidates: list[Any], fallback_candidates: list[dict[str, Any]]) -> list[dict[str, Any]]:
    normalized_candidates: list[dict[str, Any]] = []
    fallback_by_id = {
        candidate.get("wanted_post_id"): candidate
        for candidate in fallback_candidates
        if isinstance(candidate, dict) and candidate.get("wanted_post_id")
    }

    for index, raw_candidate in enumerate(raw_candidates[:3]):
        if not isinstance(raw_candidate, dict):
            continue
        raw_id = raw_candidate.get("wanted_post_id")
        fallback = fallback_by_id.get(raw_id)
        if raw_id and fallback is None:
            continue
        if fallback is None and index < len(fallback_candidates) and isinstance(fallback_candidates[index], dict):
            fallback = fallback_candidates[index]
        if fallback is None:
            continue
        base = deepcopy(fallback or {})
        for key, value in raw_candidate.items():
            if value is not None:
                base[key] = value
        if not base.get("wanted_post_id"):
            continue
        base.setdefault("title", raw_candidate.get("title") or "Candidate wanted post")
        base.setdefault("match_score", 0.0)
        base.setdefault("price_fit_score", None)
        base.setdefault("location_fit_score", None)
        base.setdefault("semantic_fit_score", None)
        base.setdefault("explanation", raw_candidate.get("explanation") or "Model selected this as a relevant buyer match.")
        base.setdefault("price_fit_summary", raw_candidate.get("price_fit_summary") or "Price fit was assessed by the model.")
        base.setdefault("location_fit_summary", raw_candidate.get("location_fit_summary") or "Location fit was assessed by the model.")
        base.setdefault("item_fit_summary", raw_candidate.get("item_fit_summary") or "Item fit was assessed by the model.")
        base.setdefault("final_match_confidence", raw_candidate.get("final_match_confidence") or "medium")
        base.setdefault("max_budget", None)
        base.setdefault("preferred_pickup_area", None)
        base["match_score"] = _coerce_number(base.get("match_score"), 0.0)
        if base["match_score"] >= 58:
            normalized_candidates.append(base)

    return normalized_candidates


def _default_trade_decision() -> dict[str, Any]:
    return {
        "recommendation": {
            "suggested_listing_price": 0.0,
            "minimum_acceptable_price": 0.0,
            "sell_fast_price": 0.0,
            "risk_score": 8.0,
            "fair_price_range": {"low": 0.0, "high": 0.0},
            "risk_level": "low",
            "best_match_candidates": [],
        },
        "why": {
            "similar_item_pattern": "Comparable evidence was limited, so the system used available campus context.",
            "condition_estimate": "Condition confidence is limited by the available listing details.",
            "local_demand_context": "Demand confidence is based on available wanted posts and campus location context.",
            "price_competitiveness": "Price competitiveness was normalized against the available fair-price signal.",
        },
        "expected_outcome": {
            "expected_time_to_sell": "5-10 days",
            "expected_buyer_interest": "moderate",
            "confidence_level": "medium",
        },
        "action": {
            "action_type": "list_now",
            "action_reason": "The listing is ready for a campus resale decision.",
            "next_steps": [],
        },
        "metadata": {
            "provider": "heuristic",
            "model": None,
            "used_fallback": False,
            "generated_at": datetime.now(UTC).isoformat(),
        },
    }


def _deep_merge(base: dict[str, Any], overrides: dict[str, Any]) -> dict[str, Any]:
    for key, value in overrides.items():
        if isinstance(value, dict) and isinstance(base.get(key), dict):
            base[key] = _deep_merge(base[key], value)
        elif value is not None:
            base[key] = value
    return base


def _coerce_number(value: Any, default: float) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return float(default)


def _normalize_choice(value: Any, allowed: tuple[str, ...], default: str) -> str:
    normalized = str(value or "").strip().lower().replace(" ", "_").replace("-", "_")
    aliases = {
        "revise": "revise_price",
        "review": "flag_for_review",
        "flag": "flag_for_review",
        "match": "match_with_buyers",
        "upload_image": "upload_better_image",
        "add_image": "upload_better_image",
    }
    normalized = aliases.get(normalized, normalized)
    return normalized if normalized in allowed else default


def _provider_name(client: GLMDecisionClient) -> str:
    name = client.__class__.__name__.lower()
    if "zai" in name:
        return "zai"
    if "demo" in name:
        return "demo"
    return name or "glm"


def _default_risk_score_for_level(risk_level: str) -> float:
    if risk_level == "high":
        return 78.0
    if risk_level == "medium":
        return 48.0
    return 18.0


def _align_risk_score(risk_level: str, risk_score: float) -> float:
    if risk_level == "high":
        return round(max(float(risk_score), 75.0), 2)
    if risk_level == "medium":
        return round(min(max(float(risk_score), 40.0), 74.0), 2)
    return round(min(float(risk_score), 34.0), 2)


def retrieve_similar_examples(db: Session, listing: Listing, limit: int = 5) -> list[dict[str, Any]]:
    repo = TradeRepository(db)
    source_text = " ".join(
        part
        for part in [
            listing.title,
            listing.item_name,
            listing.brand,
            listing.model,
            listing.category,
            listing.description,
        ]
        if part
    )
    query_vector = make_demo_embedding(source_text)
    examples: list[dict[str, Any]] = []

    for wanted_post in repo.list_active_wanted_posts():
        embedding = getattr(wanted_post, "embedding", None)
        vector = parse_embedding_text(getattr(embedding, "embedding", None))
        score = cosine_similarity(query_vector, vector) if vector else 0.0
        examples.append(
            {
                "entity_type": "wanted_post",
                "entity_id": wanted_post.id,
                "title": wanted_post.title,
                "category": wanted_post.category,
                "similarity_score": round(score, 4),
            }
        )

    for sale in repo.list_historical_sales_for_category(listing.category):
        sale_text = f"{sale.item_name} {sale.category} {sale.condition_label or ''} {sale.notes or ''}"
        score = cosine_similarity(query_vector, make_demo_embedding(sale_text))
        examples.append(
            {
                "entity_type": "historical_sale",
                "entity_id": sale.id,
                "title": sale.item_name,
                "category": sale.category,
                "sold_price": float(sale.sold_price),
                "similarity_score": round(score, 4),
            }
        )

    examples.sort(key=lambda example: example["similarity_score"], reverse=True)
    return examples[:limit]


def _sale_summary(sale: HistoricalSale) -> dict[str, Any]:
    return {
        "item_name": sale.item_name,
        "category": sale.category,
        "condition_label": sale.condition_label,
        "sold_price": float(sale.sold_price),
        "location": sale.location,
        "residential_college": sale.residential_college,
        "sold_at": sale.sold_at.isoformat() if sale.sold_at else None,
        "notes": sale.notes,
    }


def _wanted_summary(wanted_post: WantedPost) -> dict[str, Any]:
    return {
        "id": wanted_post.id,
        "title": wanted_post.title,
        "description": wanted_post.description,
        "category": wanted_post.category,
        "desired_item_name": wanted_post.desired_item_name,
        "max_budget": float(wanted_post.max_budget) if wanted_post.max_budget else None,
        "preferred_pickup_area": wanted_post.preferred_pickup_area,
        "residential_college": wanted_post.residential_college,
    }


def _risk_signal_summary(
    listing: Listing,
    fallback_result: TradeIntelligenceResult,
    reports_count: int,
    duplicate_image_count: int,
) -> dict[str, Any]:
    return {
        "heuristic_risk_level": fallback_result.recommendation.risk_level,
        "heuristic_risk_score": fallback_result.recommendation.risk_score,
        "reports_count": reports_count,
        "duplicate_image_count": duplicate_image_count,
        "has_uploaded_image_metadata": bool(listing.images),
        "current_listing_price": float(listing.price),
        "suggested_listing_price": fallback_result.recommendation.suggested_listing_price,
        "fair_price_range": (
            fallback_result.recommendation.fair_price_range.model_dump(mode="json")
            if fallback_result.recommendation.fair_price_range
            else None
        ),
        "heuristic_action_type": fallback_result.action.action_type,
        "heuristic_action_reason": fallback_result.action.action_reason,
    }


def _location_context(listing: Listing) -> str:
    if listing.pickup_area == "KK" or (listing.residential_college or "").upper().startswith("KK"):
        return "KK-related pickup usually improves hostel convenience and same-area conversion."
    if listing.pickup_area:
        return f"{listing.pickup_area} pickup gives the matching engine a location constraint."
    return "Pickup area is unspecified, so location confidence is lower."


def _listing_age_hours(listing: Listing) -> float | None:
    if not listing.created_at:
        return None
    created_at = listing.created_at
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=UTC)
    age = datetime.now(UTC) - created_at
    return round(age.total_seconds() / 3600, 2)
