from fastapi.testclient import TestClient


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
