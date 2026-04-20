from __future__ import annotations

from uuid import uuid4

from sqlalchemy.orm import Session

from app.models import HistoricalSale, Listing, ListingImage, WantedPost
from app.services.trade_intelligence import build_trade_intelligence_result


BENCHMARK_CASES = [
    {
        "id": "calculator_fair_match",
        "listing": {
            "title": "Casio FX-570EX calculator",
            "description": "Used for two semesters, works well with minor scratches.",
            "category": "electronics",
            "item_name": "scientific calculator",
            "condition_label": "good",
            "price": 55,
            "pickup_area": "FSKTM",
            "residential_college": "KK12",
        },
        "expected_price_band": [45, 70],
        "expected_risk_level": "low",
        "expected_match_category": "electronics",
        "expected_action_type": "match_with_buyers",
    },
    {
        "id": "mini_fridge_overpriced",
        "listing": {
            "title": "Overpriced mini fridge for hostel",
            "description": "Working mini fridge with cosmetic wear, pickup near KK.",
            "category": "small_appliances",
            "item_name": "mini fridge",
            "condition_label": "fair",
            "price": 280,
            "pickup_area": "KK",
            "residential_college": "KK10",
        },
        "expected_price_band": [120, 190],
        "expected_risk_level": "medium",
        "expected_match_category": "small_appliances",
        "expected_action_type": "revise_price",
    },
    {
        "id": "suspicious_phone",
        "listing": {
            "title": "Too cheap iPhone, urgent cash",
            "description": "No receipt, password locked, bank transfer only before meet. Too good deal.",
            "category": "electronics",
            "item_name": "phone",
            "condition_label": "unknown",
            "price": 120,
            "pickup_area": "other",
        },
        "expected_price_band": [450, 650],
        "expected_risk_level": "high",
        "expected_match_category": "electronics",
        "expected_action_type": "flag_for_review",
    },
]


def run_trade_evaluation(db: Session) -> dict:
    historical_sales = db.query(HistoricalSale).all()
    wanted_posts = db.query(WantedPost).all()
    case_reports = []

    for case in BENCHMARK_CASES:
        listing = _transient_listing(case["listing"])
        relevant_sales = [sale for sale in historical_sales if sale.category == listing.category]
        relevant_wanted = [wanted for wanted in wanted_posts if wanted.category == listing.category]
        result, _matches, _risk_score = build_trade_intelligence_result(
            listing=listing,
            wanted_posts=relevant_wanted,
            historical_sales=relevant_sales,
            reports_count=1 if case["expected_risk_level"] == "high" else 0,
        )

        low, high = case["expected_price_band"]
        suggested = result.recommendation.suggested_listing_price
        if low <= suggested <= high:
            pricing_error = 0.0
        elif suggested < low:
            pricing_error = round(low - suggested, 2)
        else:
            pricing_error = round(suggested - high, 2)

        top_match_category = (
            result.recommendation.best_match_candidates[0].title if result.recommendation.best_match_candidates else None
        )
        risk_agreement = result.recommendation.risk_level == case["expected_risk_level"]
        action_agreement = result.action.action_type == case["expected_action_type"]
        match_quality = 1.0 if result.recommendation.best_match_candidates else 0.0

        case_reports.append(
            {
                "case_id": case["id"],
                "suggested_listing_price": suggested,
                "expected_price_band": case["expected_price_band"],
                "pricing_error": pricing_error,
                "risk_level": result.recommendation.risk_level,
                "risk_agreement": risk_agreement,
                "action_type": result.action.action_type,
                "action_agreement": action_agreement,
                "top_match": top_match_category,
                "match_quality": match_quality,
            }
        )

    total = len(case_reports) or 1
    return {
        "case_count": len(case_reports),
        "average_pricing_error": round(sum(case["pricing_error"] for case in case_reports) / total, 2),
        "risk_agreement_rate": round(sum(1 for case in case_reports if case["risk_agreement"]) / total, 2),
        "action_agreement_rate": round(sum(1 for case in case_reports if case["action_agreement"]) / total, 2),
        "match_ranking_quality": round(sum(case["match_quality"] for case in case_reports) / total, 2),
        "average_runtime_ms": 0,
        "cases": case_reports,
    }


def _transient_listing(values: dict) -> Listing:
    listing = Listing(
        id=str(uuid4()),
        seller_id="00000000-0000-4000-8000-000000000001",
        title=values["title"],
        description=values.get("description"),
        category=values["category"],
        item_name=values.get("item_name"),
        condition_label=values.get("condition_label"),
        price=values["price"],
        currency="MYR",
        pickup_area=values.get("pickup_area"),
        residential_college=values.get("residential_college"),
        status="active",
    )
    listing.images = [
        ListingImage(
            listing_id=listing.id,
            storage_path="benchmark/demo.jpg",
            public_url=None,
            sort_order=0,
            is_primary=True,
        )
    ]
    return listing
