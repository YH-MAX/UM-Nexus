from fastapi.testclient import TestClient

from app.core.config import DEFAULT_CORS_ALLOWED_ORIGINS, Settings
from app.main import create_application


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


def test_additional_cors_origins_preserve_production_origins(monkeypatch, tmp_path) -> None:
    production = "https://um-nexus-pwa.onrender.com"
    phone = "http://192.168.0.12:3000"
    settings = Settings(
        _env_file=None,
        app_env="test",
        cors_allowed_origins=(production,),
        cors_additional_origins=f"{phone}, {production}",
        upload_storage_dir=str(tmp_path),
    )
    monkeypatch.setattr("app.main.get_settings", lambda: settings)
    with TestClient(create_application()) as client:
        for origin in (production, phone):
            response = client.options("/api/v1/listings", headers={
                "Origin": origin,
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "authorization,content-type",
            })
            assert response.status_code == 200
            assert response.headers["access-control-allow-origin"] == origin
            assert response.headers["access-control-allow-credentials"] == "true"
        rejected = client.options("/api/v1/listings", headers={
            "Origin": "http://192.168.0.13:3000",
            "Access-Control-Request-Method": "GET",
        })
        assert rejected.status_code == 400
        assert "access-control-allow-origin" not in rejected.headers


def test_additional_cors_origins_are_opt_in() -> None:
    settings = Settings(_env_file=None, cors_allowed_origins=("https://example.com",))
    assert settings.cors_additional_origins == ()
    assert settings.cors_allowed_origins == ("https://example.com",)
