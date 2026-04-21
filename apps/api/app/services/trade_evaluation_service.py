from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import desc, select
from sqlalchemy.orm import Session, selectinload

from app.core.config import get_settings
from app.models import (
    BaselineResult,
    BenchmarkCase,
    BenchmarkResult,
    BenchmarkRun,
    HistoricalSale,
    Listing,
    ListingImage,
    WantedPost,
)
from app.services.demo_user import DEMO_USER_ID, get_or_create_demo_user
from app.services.trade_baseline_service import BaselineDecision, run_baseline_for_case
from app.services.trade_intelligence import build_trade_intelligence_result
from app.services.trade_intelligence_glm_service import build_multimodal_glm_payload, generate_glm_trade_result


MATCH_IDS = {
    "calculator": "11111111-0000-4000-8000-000000000001",
    "rice_cooker": "11111111-0000-4000-8000-000000000002",
    "textbook": "11111111-0000-4000-8000-000000000003",
    "storage_box": "11111111-0000-4000-8000-000000000004",
    "mini_fridge": "11111111-0000-4000-8000-000000000005",
    "lamp": "11111111-0000-4000-8000-000000000006",
}


DEFAULT_BENCHMARK_CASES: list[dict[str, Any]] = [
    {
        "id": "22222222-0000-4000-8000-000000000001",
        "title": "Fair textbook pricing",
        "category": "textbooks",
        "listing_title": "Data Structures textbook with clean notes",
        "listing_description": "Clean used copy with highlighted algorithm chapters, useful for next semester tutorials.",
        "condition_label": "good",
        "pickup_area": "library",
        "residential_college": "KK2",
        "image_urls": ["https://placehold.co/800x600/png?text=Data+Structures+Book"],
        "expected_price_min": 36,
        "expected_price_max": 55,
        "expected_risk_level": "low",
        "expected_action_type": "match_with_buyers",
        "expected_best_match_count": 1,
        "expected_best_match_ids": [MATCH_IDS["textbook"]],
        "notes": "Common fair-pricing case where nearby library demand should produce a good match.",
    },
    {
        "id": "22222222-0000-4000-8000-000000000002",
        "title": "Overpriced calculator",
        "category": "electronics",
        "listing_title": "Overpriced Casio FX-570EX calculator",
        "listing_description": "Used calculator for exams, works well but has visible scratches on the cover.",
        "condition_label": "good",
        "pickup_area": "FSKTM",
        "residential_college": "KK12",
        "image_urls": ["https://placehold.co/800x600/png?text=Casio+Calculator"],
        "expected_price_min": 45,
        "expected_price_max": 70,
        "expected_risk_level": "medium",
        "expected_action_type": "revise_price",
        "expected_best_match_count": 1,
        "expected_best_match_ids": [MATCH_IDS["calculator"]],
        "notes": "Asking price is derived above the fair band to test price-revision guidance.",
    },
    {
        "id": "22222222-0000-4000-8000-000000000003",
        "title": "Underpriced rice cooker",
        "category": "small_appliances",
        "listing_title": "Underpriced compact rice cooker 1L",
        "listing_description": "Used for one year, still works well, minor scratches on the lid.",
        "condition_label": "good",
        "pickup_area": "KK",
        "residential_college": "KK7",
        "image_urls": ["https://placehold.co/800x600/png?text=Rice+Cooker"],
        "expected_price_min": 40,
        "expected_price_max": 60,
        "expected_risk_level": "medium",
        "expected_action_type": "revise_price",
        "expected_best_match_count": 1,
        "expected_best_match_ids": [MATCH_IDS["rice_cooker"]],
        "notes": "Derived asking price is below the fair band; the system should prevent avoidable seller loss.",
    },
    {
        "id": "22222222-0000-4000-8000-000000000004",
        "title": "Suspicious electronics listing",
        "category": "electronics",
        "listing_title": "Too cheap iPhone urgent cash",
        "listing_description": "No receipt, password locked, bank transfer only before meet. Too good deal.",
        "condition_label": "unknown",
        "pickup_area": "other",
        "residential_college": None,
        "image_urls": [],
        "expected_price_min": 450,
        "expected_price_max": 650,
        "expected_risk_level": "high",
        "expected_action_type": "flag_for_review",
        "expected_best_match_count": 0,
        "expected_best_match_ids": [],
        "notes": "Trust and safety case with suspicious wording and abnormal price.",
    },
    {
        "id": "22222222-0000-4000-8000-000000000005",
        "title": "Low-detail dorm item",
        "category": "dorm_essentials",
        "listing_title": "Storage box for hostel",
        "listing_description": "Storage box.",
        "condition_label": "good",
        "pickup_area": "KK",
        "residential_college": "KK1",
        "image_urls": [],
        "expected_price_min": 18,
        "expected_price_max": 28,
        "expected_risk_level": "medium",
        "expected_action_type": "upload_better_image",
        "expected_best_match_count": 1,
        "expected_best_match_ids": [MATCH_IDS["storage_box"]],
        "notes": "Incomplete listing should receive sell-faster guidance before promotion.",
    },
    {
        "id": "22222222-0000-4000-8000-000000000006",
        "title": "Strong same-KK match",
        "category": "small_appliances",
        "listing_title": "Compact rice cooker near KK7",
        "listing_description": "Clean rice cooker, works well, includes measuring cup and pickup at KK7.",
        "condition_label": "good",
        "pickup_area": "KK",
        "residential_college": "KK7",
        "image_urls": ["https://placehold.co/800x600/png?text=KK+Rice+Cooker"],
        "expected_price_min": 40,
        "expected_price_max": 60,
        "expected_risk_level": "low",
        "expected_action_type": "match_with_buyers",
        "expected_best_match_count": 1,
        "expected_best_match_ids": [MATCH_IDS["rice_cooker"]],
        "notes": "Location and budget should make the top buyer obvious.",
    },
    {
        "id": "22222222-0000-4000-8000-000000000007",
        "title": "Weak match case",
        "category": "electronics",
        "listing_title": "USB-C hub for laptop",
        "listing_description": "Used USB-C hub with HDMI and USB ports. Works well for laptop desk setup.",
        "condition_label": "good",
        "pickup_area": "faculty_pickup",
        "residential_college": "KK9",
        "image_urls": ["https://placehold.co/800x600/png?text=USB-C+Hub"],
        "expected_price_min": 35,
        "expected_price_max": 55,
        "expected_risk_level": "low",
        "expected_action_type": "list_now",
        "expected_best_match_count": 0,
        "expected_best_match_ids": [],
        "notes": "No exact wanted post exists; system should avoid forcing a weak match.",
    },
    {
        "id": "22222222-0000-4000-8000-000000000008",
        "title": "Move-out high-demand mini fridge",
        "category": "small_appliances",
        "listing_title": "Move-out mini fridge for hostel",
        "listing_description": "Working 50L mini fridge, cosmetic wear only, selling during move-out week near KK.",
        "condition_label": "fair",
        "pickup_area": "KK",
        "residential_college": "KK10",
        "image_urls": ["https://placehold.co/800x600/png?text=Mini+Fridge"],
        "expected_price_min": 125,
        "expected_price_max": 180,
        "expected_risk_level": "low",
        "expected_action_type": "match_with_buyers",
        "expected_best_match_count": 1,
        "expected_best_match_ids": [MATCH_IDS["mini_fridge"]],
        "notes": "Seasonal demand context should support fast matching.",
    },
    {
        "id": "22222222-0000-4000-8000-000000000009",
        "title": "Missing image study lamp",
        "category": "dorm_essentials",
        "listing_title": "LED study lamp without photo",
        "listing_description": "Like new LED study lamp with three brightness levels and clean cable.",
        "condition_label": "like new",
        "pickup_area": "KK",
        "residential_college": "KK4",
        "image_urls": [],
        "expected_price_min": 28,
        "expected_price_max": 40,
        "expected_risk_level": "medium",
        "expected_action_type": "upload_better_image",
        "expected_best_match_count": 1,
        "expected_best_match_ids": [MATCH_IDS["lamp"]],
        "notes": "Good item but missing images should trigger trust-improvement action.",
    },
    {
        "id": "22222222-0000-4000-8000-000000000010",
        "title": "Counterfeit headphones review",
        "category": "electronics",
        "listing_title": "Replica branded headphones",
        "listing_description": "Replica item, looks original. Box missing, no warranty, pay first if serious.",
        "condition_label": "used",
        "pickup_area": "other",
        "residential_college": None,
        "image_urls": [],
        "expected_price_min": 70,
        "expected_price_max": 110,
        "expected_risk_level": "high",
        "expected_action_type": "flag_for_review",
        "expected_best_match_count": 0,
        "expected_best_match_ids": [],
        "notes": "Trust/risk case with counterfeit wording and payment risk.",
    },
]


HISTORICAL_CONTEXT = [
    ("scientific calculator", "electronics", "good", 52, "FSKTM", "KK12"),
    ("scientific calculator", "electronics", "like new", 64, "FSKTM", "KK12"),
    ("scientific calculator", "electronics", "fair", 42, "library", "KK2"),
    ("phone", "electronics", "good", 520, "other", None),
    ("headphones", "electronics", "good", 90, "FSKTM", "KK11"),
    ("monitor", "electronics", "good", 220, "faculty_pickup", "KK9"),
    ("usb-c hub", "electronics", "good", 48, "faculty_pickup", "KK9"),
    ("rice cooker", "small_appliances", "good", 48, "KK", "KK7"),
    ("rice cooker", "small_appliances", "like new", 58, "KK", "KK8"),
    ("rice cooker", "small_appliances", "fair", 36, "KK", "KK3"),
    ("mini fridge", "small_appliances", "good", 165, "KK", "KK10"),
    ("mini fridge", "small_appliances", "fair", 140, "KK", "KK10"),
    ("data structures textbook", "textbooks", "good", 42, "library", "KK2"),
    ("data structures textbook", "textbooks", "like new", 54, "library", "KK2"),
    ("accounting textbook", "textbooks", "good", 34, "library", "KK3"),
    ("storage box", "dorm_essentials", "good", 22, "KK", "KK1"),
    ("study lamp", "dorm_essentials", "like new", 36, "KK", "KK4"),
    ("study lamp", "dorm_essentials", "good", 29, "KK", "KK4"),
]


WANTED_CONTEXT = [
    (MATCH_IDS["calculator"], "Looking for Casio calculator near FSKTM", "Need scientific calculator for exams.", "electronics", "scientific calculator", 60, "FSKTM", "KK12"),
    (MATCH_IDS["rice_cooker"], "Need rice cooker in KK", "Urgent small rice cooker for hostel use this week.", "small_appliances", "rice cooker", 58, "KK", "KK7"),
    (MATCH_IDS["textbook"], "Want data structures textbook", "Need a data structures textbook, can collect at library.", "textbooks", "data structures textbook", 50, "library", "KK2"),
    (MATCH_IDS["storage_box"], "Dorm storage box wanted", "Need storage box before move-in week.", "dorm_essentials", "storage box", 25, "KK", "KK1"),
    (MATCH_IDS["mini_fridge"], "Mini fridge wanted in KK", "Looking for working mini fridge for hostel room.", "small_appliances", "mini fridge", 170, "KK", "KK10"),
    (MATCH_IDS["lamp"], "Looking for study lamp", "Need a desk or study lamp for my room.", "dorm_essentials", "study lamp", 40, "KK", "KK4"),
]


def seed_benchmark_cases(db: Session) -> list[BenchmarkCase]:
    get_or_create_demo_user(db)
    created = False
    for item in DEFAULT_BENCHMARK_CASES:
        existing = db.get(BenchmarkCase, item["id"])
        if existing is None:
            db.add(BenchmarkCase(**item))
            created = True
    if created:
        db.commit()
    return list_benchmark_cases(db)


def list_benchmark_cases(db: Session) -> list[BenchmarkCase]:
    stmt = select(BenchmarkCase).order_by(BenchmarkCase.created_at, BenchmarkCase.title)
    return list(db.scalars(stmt).all())


def get_benchmark_case_detail(db: Session, case_id: str) -> dict:
    seed_benchmark_cases(db)
    benchmark_case = db.get(BenchmarkCase, case_id)
    if benchmark_case is None:
        return {"error": "Benchmark case not found"}
    return benchmark_case_detail(db, benchmark_case)


def run_trade_benchmark(db: Session, case_ids: list[str] | None = None) -> dict:
    cases = seed_benchmark_cases(db)
    if case_ids:
        case_id_set = set(case_ids)
        cases = [case for case in cases if case.id in case_id_set]

    historical_sales = _historical_sales_context(db)
    wanted_posts = _wanted_posts_context(db)
    settings = get_settings()
    model_name = settings.zai_model if settings.should_use_zai_provider else "demo-glm-trade-intelligence"

    for benchmark_case in cases:
        listing = transient_listing_from_case(benchmark_case)
        relevant_sales = [sale for sale in historical_sales if sale.category == benchmark_case.category]
        relevant_wanted_posts = [wanted for wanted in wanted_posts if wanted.category == benchmark_case.category]
        listing_price = float(listing.price)

        baseline = run_baseline_for_case(benchmark_case, historical_sales, wanted_posts, listing_price)
        baseline_score = score_baseline_result(benchmark_case, baseline)
        baseline.raw_result["score"] = baseline_score
        db.add(
            BaselineResult(
                benchmark_case_id=benchmark_case.id,
                baseline_name=baseline.baseline_name,
                predicted_price=_decimal_or_none(baseline.predicted_price),
                predicted_risk_level=baseline.predicted_risk_level,
                predicted_action_type=baseline.predicted_action_type,
                predicted_match_count=baseline.predicted_match_count,
                pricing_within_band=baseline_score["pricing_within_band"],
                risk_match=baseline_score["risk_match"],
                action_match=baseline_score["action_match"],
                overall_score=Decimal(str(baseline_score["overall_score"])),
                raw_result=baseline.raw_result,
            )
        )

        run = BenchmarkRun(
            benchmark_case_id=benchmark_case.id,
            model_name=model_name,
            run_status="running",
            started_at=datetime.now(UTC),
        )
        db.add(run)
        db.commit()
        db.refresh(run)

        try:
            fallback_result, _matches, _risk_score = build_trade_intelligence_result(
                listing=listing,
                wanted_posts=relevant_wanted_posts,
                historical_sales=relevant_sales,
                reports_count=_reports_count_for_case(benchmark_case),
            )
            payload = build_multimodal_glm_payload(db, listing, relevant_sales, relevant_wanted_posts, fallback_result)
            ai_result = generate_glm_trade_result(payload)
            ai_score = score_ai_result(benchmark_case, ai_result.model_dump(mode="json"))
            raw_result = ai_result.model_dump(mode="json")
            raw_result["evaluation_score"] = ai_score
            raw_result["listing_price_used"] = listing_price
            db.add(
                BenchmarkResult(
                    benchmark_run_id=run.id,
                    predicted_price=Decimal(str(ai_result.recommendation.suggested_listing_price)),
                    predicted_minimum_price=Decimal(str(ai_result.recommendation.minimum_acceptable_price)),
                    predicted_risk_level=ai_result.recommendation.risk_level,
                    predicted_action_type=ai_result.action.action_type,
                    predicted_match_count=len(ai_result.recommendation.best_match_candidates),
                    pricing_within_band=ai_score["pricing_within_band"],
                    risk_match=ai_score["risk_match"],
                    action_match=ai_score["action_match"],
                    match_count_reasonable=ai_score["match_count_reasonable"],
                    overall_score=Decimal(str(ai_score["overall_score"])),
                    raw_result=raw_result,
                )
            )
            run.run_status = "completed"
            run.finished_at = datetime.now(UTC)
        except Exception as exc:
            run.run_status = "failed"
            run.error_message = str(exc)
            run.finished_at = datetime.now(UTC)

        db.add(run)
        db.commit()

    return get_evaluation_summary(db)


def get_evaluation_summary(db: Session) -> dict:
    seed_benchmark_cases(db)
    cases = list_benchmark_cases(db)
    details = [benchmark_case_detail(db, case) for case in cases]
    ai_results = [detail["latest_ai_result"] for detail in details if detail.get("latest_ai_result")]
    baseline_results = [detail["latest_baseline_result"] for detail in details if detail.get("latest_baseline_result")]

    ai_score = _avg([result["overall_score"] for result in ai_results])
    baseline_score = _avg([result["overall_score"] for result in baseline_results])
    ai_pricing = _rate([result["pricing_within_band"] for result in ai_results])
    baseline_pricing = _rate([result["pricing_within_band"] for result in baseline_results])
    ai_risk = _rate([result["risk_match"] for result in ai_results])
    baseline_risk = _rate([result["risk_match"] for result in baseline_results])
    ai_action = _rate([result["action_match"] for result in ai_results])
    baseline_action = _rate([result["action_match"] for result in baseline_results])
    ai_match = _rate([result["match_count_reasonable"] for result in ai_results])
    baseline_match = _rate([
        bool((result.get("raw_result") or {}).get("score", {}).get("match_count_reasonable"))
        for result in baseline_results
    ])
    ai_days = _avg([_time_to_sale_proxy_days(result["raw_result"], is_ai=True) for result in ai_results])
    baseline_days = _avg([_time_to_sale_proxy_days(result["raw_result"], is_ai=False) for result in baseline_results])

    return {
        "case_count": len(cases),
        "evaluated_case_count": len(ai_results),
        "ai_overall_score": ai_score,
        "baseline_overall_score": baseline_score,
        "overall_score_delta": round(ai_score - baseline_score, 2),
        "ai_pricing_accuracy_rate": ai_pricing,
        "baseline_pricing_accuracy_rate": baseline_pricing,
        "price_accuracy_delta": round(ai_pricing - baseline_pricing, 2),
        "ai_risk_detection_rate": ai_risk,
        "baseline_risk_detection_rate": baseline_risk,
        "risk_detection_delta": round(ai_risk - baseline_risk, 2),
        "ai_action_agreement_rate": ai_action,
        "baseline_action_agreement_rate": baseline_action,
        "action_agreement_delta": round(ai_action - baseline_action, 2),
        "ai_match_quality_rate": ai_match,
        "baseline_match_quality_rate": baseline_match,
        "match_quality_delta": round(ai_match - baseline_match, 2),
        "ai_time_to_sale_proxy_days": ai_days,
        "baseline_time_to_sale_proxy_days": baseline_days,
        "time_to_sale_delta_days": round(baseline_days - ai_days, 2),
        "estimated_search_time_saved_minutes": max(0, round((ai_match - baseline_match) * len(cases) * 18, 1)),
        "metrics_note": (
            "Demo-stage impact uses labelled campus resale scenarios. Time-to-sale is a documented proxy "
            "derived from action, risk, pricing fit, and expected outcome text; it is not a live marketplace KPI."
        ),
        "cases": details,
    }


def benchmark_case_detail(db: Session, benchmark_case: BenchmarkCase) -> dict:
    latest_ai = _latest_ai_result_for_case(db, benchmark_case.id)
    latest_baseline = _latest_baseline_result_for_case(db, benchmark_case.id)
    case_dict = benchmark_case_to_dict(benchmark_case)
    case_dict["listing_price_used"] = derive_listing_price(benchmark_case)
    return {
        "case": case_dict,
        "latest_ai_result": benchmark_result_to_dict(latest_ai) if latest_ai else None,
        "latest_baseline_result": baseline_result_to_dict(latest_baseline) if latest_baseline else None,
        "why_ai_is_better": _why_ai_is_better(latest_ai, latest_baseline),
    }


def benchmark_case_to_dict(benchmark_case: BenchmarkCase) -> dict:
    return {
        "id": benchmark_case.id,
        "title": benchmark_case.title,
        "category": benchmark_case.category,
        "listing_title": benchmark_case.listing_title,
        "listing_description": benchmark_case.listing_description,
        "condition_label": benchmark_case.condition_label,
        "pickup_area": benchmark_case.pickup_area,
        "residential_college": benchmark_case.residential_college,
        "image_urls": benchmark_case.image_urls or [],
        "expected_price_min": _float_or_none(benchmark_case.expected_price_min),
        "expected_price_max": _float_or_none(benchmark_case.expected_price_max),
        "expected_risk_level": benchmark_case.expected_risk_level,
        "expected_action_type": benchmark_case.expected_action_type,
        "expected_best_match_count": benchmark_case.expected_best_match_count,
        "expected_best_match_ids": benchmark_case.expected_best_match_ids or [],
        "notes": benchmark_case.notes,
        "created_at": benchmark_case.created_at.isoformat() if benchmark_case.created_at else None,
    }


def benchmark_result_to_dict(result: BenchmarkResult) -> dict:
    return {
        "id": result.id,
        "benchmark_run_id": result.benchmark_run_id,
        "predicted_price": _float_or_none(result.predicted_price),
        "predicted_minimum_price": _float_or_none(result.predicted_minimum_price),
        "predicted_risk_level": result.predicted_risk_level,
        "predicted_action_type": result.predicted_action_type,
        "predicted_match_count": result.predicted_match_count,
        "pricing_within_band": result.pricing_within_band,
        "risk_match": result.risk_match,
        "action_match": result.action_match,
        "match_count_reasonable": result.match_count_reasonable,
        "overall_score": _float_or_none(result.overall_score) or 0,
        "raw_result": result.raw_result,
        "created_at": result.created_at.isoformat() if result.created_at else None,
    }


def baseline_result_to_dict(result: BaselineResult) -> dict:
    return {
        "id": result.id,
        "benchmark_case_id": result.benchmark_case_id,
        "baseline_name": result.baseline_name,
        "predicted_price": _float_or_none(result.predicted_price),
        "predicted_risk_level": result.predicted_risk_level,
        "predicted_action_type": result.predicted_action_type,
        "predicted_match_count": result.predicted_match_count,
        "pricing_within_band": result.pricing_within_band,
        "risk_match": result.risk_match,
        "action_match": result.action_match,
        "overall_score": _float_or_none(result.overall_score) or 0,
        "raw_result": result.raw_result or {},
        "created_at": result.created_at.isoformat() if result.created_at else None,
    }


def transient_listing_from_case(benchmark_case: BenchmarkCase) -> Listing:
    listing = Listing(
        id=benchmark_case.id,
        seller_id=DEMO_USER_ID,
        title=benchmark_case.listing_title,
        description=benchmark_case.listing_description,
        category=benchmark_case.category,
        item_name=_infer_item_name(benchmark_case),
        condition_label=benchmark_case.condition_label,
        price=Decimal(str(derive_listing_price(benchmark_case))),
        currency="MYR",
        pickup_area=benchmark_case.pickup_area,
        residential_college=benchmark_case.residential_college,
        status="active",
    )
    listing.images = [
        ListingImage(
            listing_id=listing.id,
            storage_path=f"benchmark/{listing.id}/image-{index + 1}.png",
            public_url=image_url,
            sort_order=index,
            is_primary=index == 0,
        )
        for index, image_url in enumerate(benchmark_case.image_urls or [])
    ]
    return listing


def derive_listing_price(benchmark_case: BenchmarkCase) -> float:
    low = float(benchmark_case.expected_price_min or 30)
    high = float(benchmark_case.expected_price_max or max(low * 1.2, low + 10))
    midpoint = (low + high) / 2
    text = f"{benchmark_case.title} {benchmark_case.listing_title} {benchmark_case.notes or ''}".lower()
    if "underpriced" in text or "too cheap" in text:
        return round(max(low * 0.58, 1), 2)
    if "overpriced" in text:
        return round(high * 1.55, 2)
    if benchmark_case.expected_action_type == "revise_price":
        return round(high * 1.35, 2)
    if benchmark_case.expected_action_type == "flag_for_review" and high > 200:
        return round(low * 0.28, 2)
    return round(midpoint, 2)


def score_ai_result(benchmark_case: BenchmarkCase, result: dict) -> dict:
    recommendation = result.get("recommendation") or {}
    action = result.get("action") or {}
    return _score_prediction(
        benchmark_case=benchmark_case,
        predicted_price=recommendation.get("suggested_listing_price"),
        predicted_risk_level=recommendation.get("risk_level"),
        predicted_action_type=action.get("action_type"),
        predicted_match_count=len(recommendation.get("best_match_candidates") or []),
    )


def score_baseline_result(benchmark_case: BenchmarkCase, baseline: BaselineDecision) -> dict:
    return _score_prediction(
        benchmark_case=benchmark_case,
        predicted_price=baseline.predicted_price,
        predicted_risk_level=baseline.predicted_risk_level,
        predicted_action_type=baseline.predicted_action_type,
        predicted_match_count=baseline.predicted_match_count,
    )


def _score_prediction(
    *,
    benchmark_case: BenchmarkCase,
    predicted_price: float | int | None,
    predicted_risk_level: str | None,
    predicted_action_type: str | None,
    predicted_match_count: int | None,
) -> dict:
    pricing = _pricing_within_band(benchmark_case, predicted_price)
    risk = predicted_risk_level == benchmark_case.expected_risk_level if benchmark_case.expected_risk_level else None
    action = predicted_action_type == benchmark_case.expected_action_type if benchmark_case.expected_action_type else None
    match = _match_count_reasonable(benchmark_case, predicted_match_count)
    components = {
        "pricing": 35 if pricing else 0,
        "risk": 25 if risk else 0,
        "action": 25 if action else 0,
        "match": 15 if match else 0,
    }
    return {
        "pricing_within_band": pricing,
        "risk_match": risk,
        "action_match": action,
        "match_count_reasonable": match,
        "overall_score": round(sum(components.values()), 2),
        "score_components": components,
    }


def _pricing_within_band(benchmark_case: BenchmarkCase, predicted_price: float | int | None) -> bool | None:
    if predicted_price is None or benchmark_case.expected_price_min is None or benchmark_case.expected_price_max is None:
        return None
    return float(benchmark_case.expected_price_min) <= float(predicted_price) <= float(benchmark_case.expected_price_max)


def _match_count_reasonable(benchmark_case: BenchmarkCase, predicted_match_count: int | None) -> bool | None:
    if predicted_match_count is None or benchmark_case.expected_best_match_count is None:
        return None
    expected = benchmark_case.expected_best_match_count
    if expected == 0:
        return predicted_match_count == 0
    return predicted_match_count >= expected


def _historical_sales_context(db: Session) -> list[HistoricalSale]:
    stored = list(db.scalars(select(HistoricalSale)).all())
    if stored:
        return stored
    return [
        HistoricalSale(
            item_name=item_name,
            category=category,
            condition_label=condition,
            sold_price=price,
            currency="MYR",
            location=location,
            residential_college=college,
            source_type="benchmark_context",
        )
        for item_name, category, condition, price, location, college in HISTORICAL_CONTEXT
    ]


def _wanted_posts_context(db: Session) -> list[WantedPost]:
    stored = list(db.scalars(select(WantedPost)).all())
    if stored:
        return stored
    return [
        WantedPost(
            id=wanted_id,
            buyer_id=DEMO_USER_ID,
            title=title,
            description=description,
            category=category,
            desired_item_name=item_name,
            max_budget=budget,
            currency="MYR",
            preferred_pickup_area=pickup_area,
            residential_college=college,
            status="active",
        )
        for wanted_id, title, description, category, item_name, budget, pickup_area, college in WANTED_CONTEXT
    ]


def _latest_ai_result_for_case(db: Session, case_id: str) -> BenchmarkResult | None:
    stmt = (
        select(BenchmarkResult)
        .join(BenchmarkRun, BenchmarkResult.benchmark_run_id == BenchmarkRun.id)
        .options(selectinload(BenchmarkResult.benchmark_run))
        .where(BenchmarkRun.benchmark_case_id == case_id)
        .order_by(desc(BenchmarkResult.created_at))
    )
    return db.scalar(stmt)


def _latest_baseline_result_for_case(db: Session, case_id: str) -> BaselineResult | None:
    stmt = (
        select(BaselineResult)
        .where(BaselineResult.benchmark_case_id == case_id)
        .order_by(desc(BaselineResult.created_at))
    )
    return db.scalar(stmt)


def _reports_count_for_case(benchmark_case: BenchmarkCase) -> int:
    text = f"{benchmark_case.title} {benchmark_case.listing_title} {benchmark_case.listing_description or ''}".lower()
    if any(term in text for term in ("fake", "replica", "locked", "no receipt", "bank transfer only")):
        return 1
    return 0


def _infer_item_name(benchmark_case: BenchmarkCase) -> str:
    text = benchmark_case.listing_title.lower()
    for item_name in (
        "scientific calculator",
        "rice cooker",
        "mini fridge",
        "data structures textbook",
        "storage box",
        "study lamp",
        "phone",
        "headphones",
        "usb-c hub",
    ):
        if all(token in text for token in item_name.split()):
            return item_name
    if "calculator" in text:
        return "scientific calculator"
    if "textbook" in text:
        return "textbook"
    return benchmark_case.listing_title


def _time_to_sale_proxy_days(raw_result: dict, *, is_ai: bool) -> float:
    if is_ai:
        expected = str((raw_result.get("expected_outcome") or {}).get("expected_time_to_sell") or "").lower()
        if "review" in expected:
            return 14
        if "1-3" in expected:
            return 2
        if "2-4" in expected:
            return 3
        if "3-6" in expected:
            return 4.5
        if "5-10" in expected:
            return 7.5
        if "week" in expected:
            return 10.5
        return 8

    action = str(raw_result.get("predicted_action_type") or "").lower()
    risk = str(raw_result.get("predicted_risk_level") or "").lower()
    match_count = int(raw_result.get("predicted_match_count") or 0)
    if action == "flag_for_review" or risk == "high":
        return 14
    if action == "revise_price":
        return 10
    if action == "upload_better_image":
        return 9
    if match_count > 0:
        return 5.5
    return 8.5


def _why_ai_is_better(ai_result: BenchmarkResult | None, baseline_result: BaselineResult | None) -> str:
    if ai_result is None or baseline_result is None:
        return "Run the benchmark to generate AI and baseline comparison evidence."
    delta = float(ai_result.overall_score or 0) - float(baseline_result.overall_score or 0)
    if delta > 0:
        return (
            f"AI scores {delta:.0f} points higher by combining price bands, risk signals, "
            "buyer demand, location context, and explainable next actions."
        )
    if delta == 0:
        return "AI matches the simple baseline score while still providing clearer explanations and action rationale."
    return "Baseline scored higher on this labelled case; inspect the explanation to refine prompts or benchmark labels."


def _rate(values: list[bool | None]) -> float:
    clean = [value for value in values if value is not None]
    if not clean:
        return 0.0
    return round(sum(1 for value in clean if value) / len(clean), 2)


def _avg(values: list[float | int | None]) -> float:
    clean = [float(value) for value in values if value is not None]
    if not clean:
        return 0.0
    return round(sum(clean) / len(clean), 2)


def _decimal_or_none(value: float | int | None) -> Decimal | None:
    if value is None:
        return None
    return Decimal(str(value))


def _float_or_none(value: Decimal | float | int | None) -> float | None:
    if value is None:
        return None
    return float(value)
