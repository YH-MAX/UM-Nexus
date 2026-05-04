from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal
from re import findall, search
from typing import Any

from app.models import Listing, WantedPost
from app.schemas.trade_intelligence import MatchCandidate


MIN_SUGGESTED_MATCH_SCORE = 58.0
MIN_RECOMMENDED_MATCH_SCORE = 74.0
MIN_RECOMMENDED_ITEM_FIT_SCORE = 58.0

URGENCY_KEYWORDS = {
    "urgent",
    "asap",
    "today",
    "tomorrow",
    "exam",
    "move-in",
    "move out",
    "this week",
    "needed soon",
}
STOPWORDS = {
    "the",
    "and",
    "for",
    "with",
    "want",
    "wants",
    "need",
    "needs",
    "needed",
    "used",
    "item",
    "good",
    "condition",
    "looking",
    "searching",
    "near",
    "prefer",
    "preferred",
    "please",
    "buy",
    "buyer",
    "seller",
    "campus",
}
CAMPUS_PICKUP_AREAS = {
    "kk1",
    "kk2",
    "kk3",
    "kk4",
    "kk5",
    "kk6",
    "kk7",
    "kk8",
    "kk9",
    "kk10",
    "kk11",
    "kk12",
    "fsktm",
    "main_library",
    "um_sentral",
    "faculty_area",
    "kk_mart",
}


@dataclass(frozen=True)
class BuyerIntent:
    wanted_post_id: str
    title: str
    category: str
    desired_terms: set[str]
    urgency_score: float
    max_budget: float | None
    preferred_pickup_area: str | None
    normalized_residential_college: str | None


@dataclass(frozen=True)
class ScoredRecommendation:
    candidate: MatchCandidate
    match_values: dict[str, Any]
    buyer_intent: BuyerIntent


def parse_buyer_intent(wanted_post: WantedPost) -> BuyerIntent:
    text = " ".join(
        part
        for part in [
            wanted_post.title,
            wanted_post.desired_item_name,
            wanted_post.description,
        ]
        if part
    )
    return BuyerIntent(
        wanted_post_id=wanted_post.id,
        title=wanted_post.title,
        category=wanted_post.category,
        desired_terms=_tokens(text),
        urgency_score=_urgency_score(text),
        max_budget=float(wanted_post.max_budget) if wanted_post.max_budget else None,
        preferred_pickup_area=wanted_post.preferred_pickup_area,
        normalized_residential_college=normalize_residential_college(wanted_post.residential_college),
    )


def recommend_buyers_for_listing(
    listing: Listing,
    wanted_posts: list[WantedPost],
    pricing: object | None = None,
    *,
    min_score: float = MIN_SUGGESTED_MATCH_SCORE,
    limit: int | None = None,
) -> tuple[list[MatchCandidate], list[dict[str, Any]]]:
    scored = [
        score_listing_for_wanted_post(listing, wanted_post, pricing)
        for wanted_post in wanted_posts
        if wanted_post.status == "active"
    ]
    scored.sort(key=lambda item: item.candidate.match_score, reverse=True)
    filtered = [item for item in scored if item.candidate.match_score >= min_score]
    if limit is not None:
        filtered = filtered[:limit]
    return [item.candidate for item in scored], [item.match_values for item in filtered]


def recommend_listings_for_wanted_post(
    wanted_post: WantedPost,
    listing_pricing_pairs: list[tuple[Listing, object | None]],
    *,
    min_score: float = MIN_SUGGESTED_MATCH_SCORE,
    limit: int = 12,
) -> list[dict[str, Any]]:
    recommendations: list[dict[str, Any]] = []
    for listing, pricing in listing_pricing_pairs:
        if listing.status != "available":
            continue
        scored = score_listing_for_wanted_post(listing, wanted_post, pricing)
        candidate = scored.candidate
        if candidate.match_score < min_score:
            continue
        recommendations.append(
            {
                "listing": listing,
                "match_score": candidate.match_score,
                "price_fit_score": candidate.price_fit_score,
                "location_fit_score": candidate.location_fit_score,
                "semantic_fit_score": candidate.semantic_fit_score,
                "final_match_confidence": candidate.final_match_confidence,
                "explanation": candidate.explanation,
                "price_fit_summary": candidate.price_fit_summary,
                "location_fit_summary": candidate.location_fit_summary,
                "item_fit_summary": candidate.item_fit_summary,
                "risk_note": buyer_risk_note(listing),
                "recommended_action": buyer_recommended_action(listing, pricing, candidate),
            }
        )

    recommendations.sort(key=lambda item: (item["match_score"], item["price_fit_score"] or 0), reverse=True)
    return recommendations[:limit]


def score_listing_for_wanted_post(
    listing: Listing,
    wanted_post: WantedPost,
    pricing: object | None = None,
) -> ScoredRecommendation:
    intent = parse_buyer_intent(wanted_post)
    item_fit = _buyer_need_fit_score(listing, intent)
    price_fit = _price_fit_score(float(listing.price), intent.max_budget)
    location_fit = _location_fit_score(listing, intent)
    listing_quality = _listing_quality_score(listing)
    match_score = round(
        item_fit * 0.35
        + price_fit * 0.25
        + location_fit * 0.25
        + intent.urgency_score * 0.10
        + listing_quality * 0.05,
        2,
    )
    if listing.category != intent.category:
        match_score = min(match_score, 35.0)
    if item_fit < 35.0:
        match_score = min(match_score, 54.0)

    confidence = match_confidence(match_score)
    price_summary = _price_fit_summary(listing, intent, price_fit)
    location_summary = _location_fit_summary(listing, intent, location_fit)
    item_summary = _item_fit_summary(listing, intent, item_fit)
    explanation = (
        f"Need fit: {item_summary} Price fit: {price_summary} "
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
        max_budget=intent.max_budget,
        preferred_pickup_area=wanted_post.preferred_pickup_area,
    )
    match_values = {
        "wanted_post_id": wanted_post.id,
        "match_score": Decimal(str(match_score)),
        "price_fit_score": Decimal(str(price_fit)),
        "location_fit_score": Decimal(str(location_fit)),
        "semantic_fit_score": Decimal(str(item_fit)),
        "status": "suggested",
        "explanation": explanation,
    }
    return ScoredRecommendation(candidate=candidate, match_values=match_values, buyer_intent=intent)


def recommended_match_candidates(candidates: list[MatchCandidate]) -> list[MatchCandidate]:
    return [
        candidate
        for candidate in candidates
        if candidate.match_score >= MIN_RECOMMENDED_MATCH_SCORE
        and (candidate.semantic_fit_score or 0) >= MIN_RECOMMENDED_ITEM_FIT_SCORE
    ]


def normalize_residential_college(value: str | None) -> str | None:
    if not value:
        return None
    text = value.strip().lower()
    if not text:
        return None
    if text in {"kk", "kolej kediaman", "residential college"}:
        return "KK"

    kk_match = search(r"(?:\bkk\b|kolej\s+kediaman|residential\s+college)\s*0*([0-9]{1,2})\b", text)
    if kk_match:
        return f"KK{int(kk_match.group(1))}"

    compact_match = search(r"\bkk\s*0*([0-9]{1,2})\b", text.replace("-", " "))
    if compact_match:
        return f"KK{int(compact_match.group(1))}"

    if text.isdigit():
        return f"KK{int(text)}"

    return " ".join(text.split()).upper()


def buyer_risk_note(listing: Listing) -> str:
    risk_level = listing.risk_level or "unscored"
    if risk_level == "high":
        return "High trust risk: review seller details or wait for moderation before contacting."
    if risk_level == "medium":
        return "Medium trust risk: ask for clearer photos or proof before committing."
    if listing.risk_score and float(listing.risk_score) >= 35:
        return "Some trust signals need checking before pickup."
    return "Low visible risk based on current listing signals."


def buyer_recommended_action(listing: Listing, pricing: object | None, candidate: MatchCandidate) -> str:
    if listing.risk_level == "high":
        return "wait_for_review"
    fair_high = getattr(pricing, "fair_high", None)
    if fair_high is not None and float(listing.price) > float(fair_high) * 1.12:
        return "negotiate_price"
    if candidate.match_score >= MIN_RECOMMENDED_MATCH_SCORE:
        return "contact_seller"
    return "watch_listing"


def match_confidence(score: float) -> str:
    if score >= 84:
        return "very high"
    if score >= 74:
        return "high"
    if score >= 58:
        return "medium"
    return "low"


def _buyer_need_fit_score(listing: Listing, intent: BuyerIntent) -> float:
    if listing.category != intent.category:
        return 0.0

    listing_text = " ".join(
        part
        for part in [listing.title, listing.item_name, listing.brand, listing.model, listing.description]
        if part
    )
    listing_tokens = _tokens(listing_text)
    if not intent.desired_terms:
        return 55.0
    if intent.desired_terms <= _tokens(intent.category):
        return 55.0
    if not listing_tokens:
        return 30.0

    overlap = len(listing_tokens & intent.desired_terms) / max(len(intent.desired_terms), 1)
    if overlap == 0:
        return 24.0

    score = 38 + overlap * 55
    item_tokens = _tokens(listing.item_name or "")
    title_tokens = _tokens(listing.title or "")
    if item_tokens & intent.desired_terms:
        score += 14
    if title_tokens & intent.desired_terms:
        score += 8
    return round(min(score, 100.0), 2)


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


def _location_fit_score(listing: Listing, intent: BuyerIntent) -> float:
    listing_college = normalize_residential_college(listing.residential_college)
    if listing_college and intent.normalized_residential_college and listing_college == intent.normalized_residential_college:
        return 100.0

    listing_pickup = _normalize_pickup_area(getattr(listing, "pickup_location", None) or listing.pickup_area)
    buyer_pickup = _normalize_pickup_area(intent.preferred_pickup_area)
    if listing_pickup and buyer_pickup and listing_pickup == buyer_pickup:
        return 94.0

    if _is_kk_related(listing_pickup, listing_college) and _is_kk_related(
        buyer_pickup,
        intent.normalized_residential_college,
    ):
        return 88.0

    if not listing_pickup or not buyer_pickup:
        return 62.0

    if "other" in {listing_pickup, buyer_pickup}:
        return 45.0

    if listing_pickup in CAMPUS_PICKUP_AREAS and buyer_pickup in CAMPUS_PICKUP_AREAS:
        return 72.0

    return 66.0


def _listing_quality_score(listing: Listing) -> float:
    score = 50.0
    if getattr(listing, "images", None):
        score += 18
    if listing.description and len(listing.description) >= 35:
        score += 16
    if listing.item_name:
        score += 8
    if listing.risk_level == "high":
        score -= 35
    elif listing.risk_level == "medium":
        score -= 12
    created_at = getattr(listing, "created_at", None)
    if isinstance(created_at, datetime):
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=UTC)
        now = datetime.now(created_at.tzinfo)
        if (now - created_at).days <= 14:
            score += 8
    return round(max(0.0, min(score, 100.0)), 2)


def _urgency_score(text: str) -> float:
    lowered = text.lower()
    return 100.0 if any(keyword in lowered for keyword in URGENCY_KEYWORDS) else 55.0


def _price_fit_summary(listing: Listing, intent: BuyerIntent, score: float) -> str:
    if intent.max_budget is None:
        return "Buyer did not set a budget, so price fit is moderate."
    if float(listing.price) <= intent.max_budget:
        return f"Listing price is within the buyer's RM{intent.max_budget:.0f} budget."
    if score >= 55:
        return "Listing is slightly above budget but still close enough for negotiation."
    return "Listing is meaningfully above the buyer budget and may need a price revision."


def _location_fit_summary(listing: Listing, intent: BuyerIntent, score: float) -> str:
    listing_college = normalize_residential_college(listing.residential_college)
    if score >= 100 and listing_college:
        return f"Both sides are in {listing_college}, so pickup friction is very low."
    if score >= 94:
        return f"Both sides prefer {getattr(listing, 'pickup_location', None) or listing.pickup_area}, making pickup highly convenient."
    if score >= 88:
        return "Both sides are KK-related, so handoff friction is low."
    if score >= 66:
        return "Pickup locations are workable campus handoff points."
    if score >= 62:
        return "One side has not specified pickup, so location fit is moderate."
    return "Pickup preferences are weakly aligned."


def _item_fit_summary(listing: Listing, intent: BuyerIntent, score: float) -> str:
    if score >= 85:
        return "Buyer need closely matches the listing title and item details."
    if score >= 65:
        return "Buyer need partially matches the listing item and category."
    if score >= 35:
        return "Category matches, but the buyer need is broad or uncertain."
    return "Buyer need does not clearly match this listing."


def _normalize_pickup_area(value: str | None) -> str | None:
    normalized = value.strip().lower().replace(" ", "_").replace("-", "_") if value else None
    aliases = {
        "kk": "kk1",
        "library": "main_library",
        "faculty_pickup": "faculty_area",
    }
    return aliases.get(normalized, normalized) if normalized else None


def _is_kk_related(pickup_area: str | None, normalized_college: str | None) -> bool:
    return bool((pickup_area and pickup_area.startswith("kk")) or (normalized_college and normalized_college.startswith("KK")))


def _tokens(value: str) -> set[str]:
    return {token for token in findall(r"[a-z0-9]+", value.lower()) if len(token) > 2 and token not in STOPWORDS}
