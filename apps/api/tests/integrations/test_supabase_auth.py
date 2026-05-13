import httpx
import pytest

from app.core.config import Settings
from app.integrations.supabase_auth import (
    SupabaseAuthTokenError,
    SupabaseAuthUserClient,
)


def auth_settings() -> Settings:
    return Settings(
        _env_file=None,
        supabase_url="https://project-ref.supabase.co",
        supabase_service_role_key="test-service-role",
    )


def test_supabase_auth_user_lookup_returns_email_confirmation_status() -> None:
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(
            200,
            json={
                "id": "user-1",
                "email": "student@siswa.um.edu.my",
                "email_confirmed_at": "2026-01-01T00:00:00Z",
            },
        )

    transport = httpx.MockTransport(handler)
    with httpx.Client(transport=transport) as http_client:
        client = SupabaseAuthUserClient(settings=auth_settings(), http_client=http_client)
        auth_user = client.get_user("user-access-token")

    assert auth_user.id == "user-1"
    assert auth_user.email == "student@siswa.um.edu.my"
    assert auth_user.has_confirmed_email is True
    assert requests[0].headers["authorization"] == "Bearer user-access-token"
    assert requests[0].headers["apikey"] == "test-service-role"


def test_supabase_auth_user_lookup_preserves_unconfirmed_email_status() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "id": "user-1",
                "email": "student@siswa.um.edu.my",
                "email_confirmed_at": None,
            },
        )

    transport = httpx.MockTransport(handler)
    with httpx.Client(transport=transport) as http_client:
        client = SupabaseAuthUserClient(settings=auth_settings(), http_client=http_client)
        auth_user = client.get_user("user-access-token")

    assert auth_user.has_confirmed_email is False


def test_supabase_auth_user_lookup_rejects_invalid_token() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(401, json={"msg": "invalid JWT"})

    transport = httpx.MockTransport(handler)
    with httpx.Client(transport=transport) as http_client:
        client = SupabaseAuthUserClient(settings=auth_settings(), http_client=http_client)
        with pytest.raises(SupabaseAuthTokenError):
            client.get_user("bad-token")
