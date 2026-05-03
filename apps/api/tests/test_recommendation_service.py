from datetime import UTC, datetime
from decimal import Decimal
from types import SimpleNamespace

from app.services.recommendation_service import (
    normalize_residential_college,
    score_listing_for_wanted_post,
)


def listing(**overrides):
    values = {
        "id": "listing-1",
        "title": "Casio FX-570EX scientific calculator",
        "description": "Scientific calculator in good condition with minor scratches.",
        "category": "electronics",
        "item_name": "scientific calculator",
        "brand": "Casio",
        "model": "FX-570EX",
        "price": Decimal("55"),
        "pickup_area": "FSKTM",
        "residential_college": "KK12",
        "status": "active",
        "risk_level": "low",
        "risk_score": Decimal("10"),
        "images": [object()],
        "created_at": datetime.now(UTC),
    }
    values.update(overrides)
    return SimpleNamespace(**values)


def wanted_post(**overrides):
    values = {
        "id": "wanted-1",
        "title": "Need Casio scientific calculator",
        "description": "Need a calculator for exams.",
        "category": "electronics",
        "desired_item_name": "scientific calculator",
        "max_budget": Decimal("60"),
        "preferred_pickup_area": "FSKTM",
        "residential_college": "kk 12",
        "status": "active",
    }
    values.update(overrides)
    return SimpleNamespace(**values)


def test_normalized_same_kk_outscores_generic_kk_match() -> None:
    assert normalize_residential_college("Kolej Kediaman 12") == "KK12"

    same_kk = score_listing_for_wanted_post(
        listing(residential_college="KK12", pickup_area=None),
        wanted_post(residential_college="kk 12", preferred_pickup_area=None),
    )
    different_kk = score_listing_for_wanted_post(
        listing(residential_college="KK13", pickup_area=None),
        wanted_post(residential_college="Kolej Kediaman 12", preferred_pickup_area=None),
    )

    assert same_kk.candidate.location_fit_score == 100
    assert different_kk.candidate.location_fit_score == 88
    assert same_kk.candidate.match_score > different_kk.candidate.match_score


def test_exact_pickup_match_scores_high_without_residential_college() -> None:
    scored = score_listing_for_wanted_post(
        listing(residential_college=None, pickup_area="FSKTM"),
        wanted_post(residential_college=None, preferred_pickup_area="FSKTM"),
    )

    assert scored.candidate.location_fit_score == 94
    assert scored.candidate.match_score >= 74


def test_item_mismatch_is_suppressed_even_when_location_is_close() -> None:
    scored = score_listing_for_wanted_post(
        listing(residential_college="KK12", pickup_area="KK"),
        wanted_post(
            title="Need microwave in KK12",
            desired_item_name="microwave",
            description="Need a microwave urgently and can collect at KK12.",
            preferred_pickup_area="KK",
            residential_college="KK12",
        ),
    )

    assert scored.candidate.semantic_fit_score < 35
    assert scored.candidate.match_score < 58


def test_slightly_over_budget_listing_is_downgraded_but_not_removed() -> None:
    scored = score_listing_for_wanted_post(
        listing(price=Decimal("66")),
        wanted_post(max_budget=Decimal("60")),
    )

    assert scored.candidate.price_fit_score == 82
    assert scored.candidate.match_score >= 58


def test_urgent_wanted_post_receives_measurable_boost() -> None:
    normal = score_listing_for_wanted_post(
        listing(),
        wanted_post(description="Can collect next week."),
    )
    urgent = score_listing_for_wanted_post(
        listing(),
        wanted_post(description="Urgent, need it today for exam."),
    )

    assert urgent.candidate.match_score > normal.candidate.match_score
