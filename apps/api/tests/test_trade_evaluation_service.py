from app.models import AppRole, BaselineResult, BenchmarkCase, BenchmarkResult, Profile, User
from app.services.trade_evaluation_service import DEFAULT_BENCHMARK_CASES
from app.services.trade_intelligence_glm_service import normalize_trade_decision


AUTH_HEADERS = {"Authorization": "Bearer test-token"}


def make_admin(db_session, token_verifier) -> None:
    admin = User(id=str(token_verifier.claims.sub), email="admin@siswa.um.edu.my")
    admin.profile = Profile(app_role=AppRole.ADMIN)
    db_session.add(admin)
    db_session.commit()


def test_evaluation_cases_endpoint_seeds_benchmark_cases(client, db_session, token_verifier) -> None:
    make_admin(db_session, token_verifier)

    response = client.get("/api/v1/ai/trade/evaluation/cases", headers=AUTH_HEADERS)

    assert response.status_code == 200
    cases = response.json()
    assert len(cases) >= 10
    assert db_session.query(BenchmarkCase).count() >= len(DEFAULT_BENCHMARK_CASES)
    assert cases[0]["case"]["expected_action_type"]


def test_evaluation_run_persists_ai_and_baseline_results(client, db_session, token_verifier) -> None:
    make_admin(db_session, token_verifier)

    response = client.post("/api/v1/ai/trade/evaluation/run", headers=AUTH_HEADERS)

    assert response.status_code == 200
    body = response.json()
    assert body["case_count"] >= 10
    assert body["evaluated_case_count"] >= 10
    assert "ai_overall_score" in body
    assert "baseline_overall_score" in body
    assert "price_accuracy_delta" in body
    assert db_session.query(BenchmarkResult).count() >= 10
    assert db_session.query(BaselineResult).count() >= 10


def test_evaluation_summary_returns_latest_comparison(client, db_session, token_verifier) -> None:
    make_admin(db_session, token_verifier)

    client.post("/api/v1/ai/trade/evaluation/run", headers=AUTH_HEADERS)

    response = client.get("/api/v1/ai/trade/evaluation/summary", headers=AUTH_HEADERS)

    assert response.status_code == 200
    body = response.json()
    assert body["cases"]
    first_case = body["cases"][0]
    assert "latest_ai_result" in first_case
    assert "latest_baseline_result" in first_case
    assert "why_ai_is_better" in first_case


def test_normalize_trade_decision_repairs_provider_formatting_drift() -> None:
    fallback = {
        "recommendation": {
            "suggested_listing_price": 50,
            "minimum_acceptable_price": 40,
            "fair_price_range": {"low": 45, "high": 60},
            "risk_level": "low",
            "best_match_candidates": [],
        },
        "why": {
            "similar_item_pattern": "Fallback comparable pattern.",
            "condition_estimate": "Fallback condition.",
            "local_demand_context": "Fallback demand.",
            "price_competitiveness": "Fallback price competitiveness.",
        },
        "expected_outcome": {
            "expected_time_to_sell": "5-10 days",
            "expected_buyer_interest": "moderate",
            "confidence_level": "medium",
        },
        "action": {"action_type": "list_now", "action_reason": "Fallback action."},
    }
    raw = {
        "recommendation": {"risk_level": "HIGH", "suggested_listing_price": "55"},
        "action": {"action_type": "flag for review"},
    }

    normalized = normalize_trade_decision(raw, fallback)

    assert normalized["recommendation"]["risk_level"] == "high"
    assert normalized["recommendation"]["suggested_listing_price"] == 55
    assert normalized["action"]["action_type"] == "flag_for_review"
    assert normalized["why"]["similar_item_pattern"] == "Fallback comparable pattern."
