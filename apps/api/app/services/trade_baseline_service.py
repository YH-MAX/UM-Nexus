from __future__ import annotations

from dataclasses import dataclass
from statistics import mean

from app.models import BenchmarkCase, HistoricalSale, WantedPost


BASELINE_NAME = "category-average-manual-baseline"


@dataclass(frozen=True)
class BaselineDecision:
    baseline_name: str
    predicted_price: float | None
    predicted_risk_level: str | None
    predicted_action_type: str | None
    predicted_match_count: int
    raw_result: dict


SUSPICIOUS_TERMS = {
    "fake",
    "replica",
    "stolen",
    "locked",
    "icloud",
    "password",
    "no receipt",
    "bank transfer only",
    "pay first",
}


def run_baseline_for_case(
    benchmark_case: BenchmarkCase,
    historical_sales: list[HistoricalSale],
    wanted_posts: list[WantedPost],
    listing_price: float,
) -> BaselineDecision:
    category_sales = [sale for sale in historical_sales if sale.category == benchmark_case.category]
    category_wanted = [post for post in wanted_posts if post.category == benchmark_case.category]

    predicted_price = _category_average_price(category_sales)
    predicted_risk_level = _basic_risk_level(benchmark_case, listing_price, predicted_price)
    predicted_match_count = _category_budget_match_count(category_wanted, listing_price)
    predicted_action_type = _basic_action(
        benchmark_case=benchmark_case,
        listing_price=listing_price,
        predicted_price=predicted_price,
        predicted_risk_level=predicted_risk_level,
        predicted_match_count=predicted_match_count,
    )

    raw_result = {
        "baseline_name": BASELINE_NAME,
        "method": {
            "pricing": "Average historical sale price for the same category only.",
            "matching": "Counts wanted posts in same category where budget covers current listing price.",
            "risk": "Checks a small suspicious-keyword list plus large price deviation.",
            "action": "Applies simple thresholds with no multimodal or campus-context reasoning.",
        },
        "predicted_price": predicted_price,
        "predicted_risk_level": predicted_risk_level,
        "predicted_action_type": predicted_action_type,
        "predicted_match_count": predicted_match_count,
        "listing_price": listing_price,
    }

    return BaselineDecision(
        baseline_name=BASELINE_NAME,
        predicted_price=predicted_price,
        predicted_risk_level=predicted_risk_level,
        predicted_action_type=predicted_action_type,
        predicted_match_count=predicted_match_count,
        raw_result=raw_result,
    )


def _category_average_price(category_sales: list[HistoricalSale]) -> float | None:
    if not category_sales:
        return None
    return round(mean(float(sale.sold_price) for sale in category_sales), 2)


def _basic_risk_level(
    benchmark_case: BenchmarkCase,
    listing_price: float,
    predicted_price: float | None,
) -> str:
    text = f"{benchmark_case.listing_title} {benchmark_case.listing_description or ''}".lower()
    if any(term in text for term in SUSPICIOUS_TERMS):
        return "high"
    if predicted_price and (listing_price < predicted_price * 0.55 or listing_price > predicted_price * 1.75):
        return "medium"
    if not benchmark_case.listing_description or len(benchmark_case.listing_description.strip()) < 30:
        return "medium"
    return "low"


def _category_budget_match_count(wanted_posts: list[WantedPost], listing_price: float) -> int:
    count = 0
    for wanted_post in wanted_posts:
        if wanted_post.max_budget is None or float(wanted_post.max_budget) >= listing_price:
            count += 1
    return count


def _basic_action(
    *,
    benchmark_case: BenchmarkCase,
    listing_price: float,
    predicted_price: float | None,
    predicted_risk_level: str,
    predicted_match_count: int,
) -> str:
    if predicted_risk_level == "high":
        return "flag_for_review"
    if not benchmark_case.image_urls:
        return "upload_better_image"
    if predicted_price and (listing_price > predicted_price * 1.3 or listing_price < predicted_price * 0.7):
        return "revise_price"
    if predicted_match_count > 0:
        return "match_with_buyers"
    return "list_now"
