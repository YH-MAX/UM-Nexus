from app.core.config import get_settings
from app.integrations import glm_client as glm_module
from app.models import AgentOutput


def test_glm_test_endpoint_returns_success_on_mocked_response(client, monkeypatch) -> None:
    class FakeZAIGLMClient:
        model_name = "GLM-4.6V"

        def __init__(self, settings) -> None:
            self.settings = settings

        def simple_test(self) -> str:
            return "Mocked Z.AI connectivity OK"

    import app.api.v1.endpoints.ai_trade as endpoint_module

    monkeypatch.setattr(endpoint_module, "ZAIGLMClient", FakeZAIGLMClient)

    response = client.get("/api/v1/ai/trade/test-glm")

    assert response.status_code == 200
    assert response.json() == {
        "success": True,
        "model": "GLM-4.6V",
        "message_preview": "Mocked Z.AI connectivity OK",
        "response_text": "Mocked Z.AI connectivity OK",
        "error_message": None,
    }


def test_glm_test_endpoint_returns_failure_on_provider_error(client, monkeypatch) -> None:
    class FailingZAIGLMClient:
        model_name = "GLM-4.6V"

        def __init__(self, settings) -> None:
            self.settings = settings

        def simple_test(self) -> str:
            raise RuntimeError("Z.AI request failed with status 401.")

    import app.api.v1.endpoints.ai_trade as endpoint_module

    monkeypatch.setattr(endpoint_module, "ZAIGLMClient", FailingZAIGLMClient)

    response = client.get("/api/v1/ai/trade/test-glm")

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is False
    assert body["model"] == "glm-4.6v"
    assert body["message_preview"] is None
    assert body["error_message"] == "Z.AI request failed with status 401."


def test_enrich_listing_uses_mocked_zai_provider_and_persists_output(client, db_session, monkeypatch) -> None:
    settings = get_settings()
    settings.glm_provider = "zai"
    settings.zai_api_key = "test-secret"
    settings.zai_model = "GLM-4.6V"
    captured_payloads: list[dict] = []

    class FakeZAIGLMClient:
        def __init__(self, settings) -> None:
            self.settings = settings

        def generate_trade_decision(self, payload: dict) -> dict:
            captured_payloads.append(payload)
            result = payload["fallback_result"]
            result["why"]["condition_estimate"] = "Mocked Z.AI reviewed image and seller text together."
            result["action"]["action_type"] = "list_now"
            result["action"]["action_reason"] = "Mocked Z.AI says the listing is ready for a safe campus sale."
            return result

    monkeypatch.setattr(glm_module, "ZAIGLMClient", FakeZAIGLMClient)

    listing_response = client.post(
        "/api/v1/listings",
        json={
            "title": "Casio calculator with clear photo",
            "description": "Used for one semester, works well, buttons are clean.",
            "category": "electronics",
            "item_name": "scientific calculator",
            "condition_label": "good",
            "price": 52,
            "currency": "MYR",
            "pickup_area": "KK",
        },
    )
    listing_id = listing_response.json()["id"]
    client.post(
        f"/api/v1/listings/{listing_id}/images",
        json={"storage_path": "demo/calculator.jpg", "public_url": "https://cdn.umnexus.edu.my/calculator.jpg", "is_primary": True},
    )

    accepted = client.post(f"/api/v1/ai/trade/enrich-listing/{listing_id}")
    result = client.get(f"/api/v1/ai/trade/result/{listing_id}")

    assert accepted.status_code == 202
    assert result.status_code == 200
    body = result.json()
    assert body["status"] == "completed"
    assert body["last_run_id"] == accepted.json()["agent_run_id"]
    assert body["result"]["why"]["condition_estimate"] == "Mocked Z.AI reviewed image and seller text together."
    assert body["result"]["action"]["action_type"] == "list_now"
    assert captured_payloads
    assert captured_payloads[0]["image_references"][0]["public_url"] == "https://cdn.umnexus.edu.my/calculator.jpg"
    assert captured_payloads[0]["structured_context"]["image_analysis"]["mode"] == "multimodal"

    outputs = db_session.query(AgentOutput).all()
    assert any(output.output_type == "trade_intelligence_result" for output in outputs)
