import json

import httpx
import pytest
from pydantic import ValidationError
from zai.core import APIReachLimitError

from app.core.config import Settings
from app.integrations.glm_client import GLMProviderError, ZAIGLMClient


def zai_settings(**overrides) -> Settings:
    values = {
        "glm_provider": "zai",
        "zai_api_key": "test-secret",
        "zai_model": "glm-4.6v",
        "zai_timeout_seconds": 3,
        "zai_max_retries": 1,
    }
    values.update(overrides)
    return Settings(_env_file=None, **values)


class FakeCompletions:
    def __init__(self, response=None, error: Exception | None = None) -> None:
        self.response = response
        self.error = error
        self.calls: list[dict] = []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        if self.error:
            raise self.error
        return self.response


class FakeChat:
    def __init__(self, completions: FakeCompletions) -> None:
        self.completions = completions


class FakeSDKClient:
    def __init__(self, completions: FakeCompletions) -> None:
        self.chat = FakeChat(completions)


def completion(content: str) -> dict:
    return {"choices": [{"message": {"content": content}}]}


def test_zai_config_loads_env_values() -> None:
    settings = zai_settings(zai_timeout_seconds=12, zai_max_retries=2)

    assert settings.zai_api_key == "test-secret"
    assert settings.zai_model == "glm-4.6v"
    assert settings.zai_timeout_seconds == 12
    assert settings.zai_max_retries == 2


def test_zai_config_fails_when_selected_provider_is_missing_required_values() -> None:
    with pytest.raises(ValidationError, match="Missing required Z.AI settings"):
        Settings(
            _env_file=None,
            glm_provider="zai",
            zai_api_key="",
            zai_model="",
        )


def test_simple_test_uses_sdk_model_and_timeout() -> None:
    completions = FakeCompletions(response=completion("Z.AI connection OK"))
    client = ZAIGLMClient(zai_settings(), sdk_client=FakeSDKClient(completions))

    assert client.simple_test() == "Z.AI connection OK"
    call = completions.calls[0]
    assert call["model"] == "glm-4.6v"
    assert call["timeout"] == 3
    assert call["messages"][0]["role"] == "user"


def test_analyze_trade_listing_parses_successful_multimodal_sdk_response() -> None:
    provider_result = {
        "recommendation": {
            "suggested_listing_price": 55,
            "minimum_acceptable_price": 44,
            "risk_level": "low",
            "best_match_candidates": [],
        },
        "why": {
            "similar_item_pattern": "Comparable campus sales cluster around RM50-RM60.",
            "condition_estimate": "Image and text suggest good used condition.",
            "local_demand_context": "KK pickup has nearby demand.",
            "price_competitiveness": "The price is fair against campus comparables.",
        },
        "expected_outcome": {
            "expected_time_to_sell": "2-4 days",
            "expected_buyer_interest": "high",
            "confidence_level": "high",
        },
        "action": {
            "action_type": "list_now",
            "action_reason": "The listing is clear, fairly priced, and low risk.",
        },
    }
    completions = FakeCompletions(response=completion(json.dumps(provider_result)))
    client = ZAIGLMClient(zai_settings(), sdk_client=FakeSDKClient(completions))

    parsed = client.analyze_trade_listing(
        listing={"id": "listing-1", "category": "electronics"},
        structured_context={"campus": "University of Malaya"},
        comparable_sales_summary=[],
        candidate_matches_summary=[],
        image_references=[{"public_url": "https://cdn.umnexus.edu.my/item.jpg"}],
        retrieved_examples=[],
        fallback_result={},
        prompt="Return JSON.",
    )

    call = completions.calls[0]
    assert call["response_format"] == {"type": "json_object"}
    assert call["messages"][1]["content"][1]["image_url"]["url"] == "https://cdn.umnexus.edu.my/item.jpg"
    assert parsed["recommendation"]["suggested_listing_price"] == 55
    assert parsed["action"]["action_type"] == "list_now"


def test_429_error_handling_uses_clean_message() -> None:
    request = httpx.Request("POST", "https://api.z.ai/api/paas/v4/chat/completions")
    response = httpx.Response(429, request=request, text='{"error":"quota"}')
    completions = FakeCompletions(error=APIReachLimitError("rate limited", response=response))
    client = ZAIGLMClient(zai_settings(), sdk_client=FakeSDKClient(completions))

    with pytest.raises(GLMProviderError, match="rate limit or quota exceeded"):
        client.simple_test()


def test_malformed_response_handling() -> None:
    completions = FakeCompletions(response=completion("not json"))
    client = ZAIGLMClient(zai_settings(), sdk_client=FakeSDKClient(completions))

    with pytest.raises(GLMProviderError, match="could not be parsed as JSON"):
        client.analyze_trade_listing(
            listing={"id": "listing-1", "category": "electronics"},
            structured_context={},
            comparable_sales_summary=[],
            candidate_matches_summary=[],
            image_references=[],
            retrieved_examples=[],
            fallback_result={},
            prompt="Return JSON.",
        )


def test_localhost_image_urls_fall_back_to_text_only_before_provider_call() -> None:
    completions = FakeCompletions(response=completion("{}"))
    client = ZAIGLMClient(zai_settings(), sdk_client=FakeSDKClient(completions))

    parsed = client.analyze_trade_listing(
        listing={"id": "listing-1", "category": "electronics"},
        structured_context={},
        comparable_sales_summary=[],
        candidate_matches_summary=[],
        image_references=[{"public_url": "http://localhost:8001/uploads/item.jpg"}],
        retrieved_examples=[],
        fallback_result={},
        prompt="Return JSON.",
    )

    assert parsed == {}
    assert len(completions.calls) == 1
    assert completions.calls[0]["messages"][1]["content"] == [{"type": "text", "text": "Return JSON."}]


def test_plain_http_image_urls_fall_back_to_text_only() -> None:
    completions = FakeCompletions(response=completion("{}"))
    client = ZAIGLMClient(zai_settings(), sdk_client=FakeSDKClient(completions))

    client.analyze_trade_listing(
        listing={"id": "listing-1", "category": "electronics"},
        structured_context={},
        comparable_sales_summary=[],
        candidate_matches_summary=[],
        image_references=[{"public_url": "http://cdn.umnexus.edu.my/item.jpg"}],
        retrieved_examples=[],
        fallback_result={},
        prompt="Return JSON.",
    )

    assert len(completions.calls) == 1
    assert completions.calls[0]["messages"][1]["content"] == [{"type": "text", "text": "Return JSON."}]
