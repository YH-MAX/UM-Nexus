from fastapi.testclient import TestClient

from app.core.config import DEFAULT_CORS_ALLOWED_ORIGINS


def test_health_endpoint_includes_product_metadata(client: TestClient) -> None:
    response = client.get("/health", headers={"x-request-id": "test-request-id"})

    assert response.status_code == 200
    assert response.json()["service"] == "um-nexus-api"
    assert response.json()["status"] == "ok"
    assert response.headers["x-request-id"] == "test-request-id"
    assert response.headers["x-content-type-options"] == "nosniff"


def test_readiness_endpoint_checks_runtime_dependencies(client: TestClient) -> None:
    response = client.get("/health/ready")

    assert response.status_code == 200
    body = response.json()
    assert body["service"] == "um-nexus-api"
    assert body["status"] == "ready"
    assert body["checks"]["database"] == "ok"
    assert body["checks"]["storage"] == "ok"


def test_default_cors_origins_cover_local_web_and_e2e_ports() -> None:
    assert "http://localhost:3000" in DEFAULT_CORS_ALLOWED_ORIGINS
    assert "http://127.0.0.1:3000" in DEFAULT_CORS_ALLOWED_ORIGINS
    assert "http://localhost:3100" in DEFAULT_CORS_ALLOWED_ORIGINS
    assert "http://127.0.0.1:3100" in DEFAULT_CORS_ALLOWED_ORIGINS
