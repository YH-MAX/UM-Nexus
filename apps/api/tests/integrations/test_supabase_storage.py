import asyncio
import base64
import json

import httpx
import pytest

from app.core.exceptions import ConfigurationError
from app.core.config import Settings
from app.integrations.supabase_storage import SupabaseStorageClient


def storage_settings() -> Settings:
    return Settings(
        _env_file=None,
        supabase_url="https://project-ref.supabase.co",
        supabase_service_role_key="test-service-role",
        supabase_storage_bucket="listing-images",
    )


def test_public_url_generation_uses_supabase_storage_public_object_path() -> None:
    client = SupabaseStorageClient(settings=storage_settings())

    public_url = client.public_url_for("listings/listing-1/item photo.jpg")

    assert public_url == (
        "https://project-ref.supabase.co/storage/v1/object/public/"
        "listing-images/listings/listing-1/item%20photo.jpg"
    )


def test_supabase_storage_upload_helper_posts_file_and_returns_metadata() -> None:
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(200, json={"Key": "listing-images/listings/listing-1/photo.jpg"})

    async def run_test() -> None:
        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(transport=transport) as http_client:
            client = SupabaseStorageClient(settings=storage_settings(), http_client=http_client)
            uploaded = await client.upload_public_file(
                storage_path="listings/listing-1/photo.jpg",
                content=b"image-bytes",
                mime_type="image/jpeg",
            )

        assert uploaded.storage_bucket == "listing-images"
        assert uploaded.storage_path == "listings/listing-1/photo.jpg"
        assert uploaded.public_url.endswith("/listing-images/listings/listing-1/photo.jpg")
        assert uploaded.mime_type == "image/jpeg"
        assert uploaded.file_size == len(b"image-bytes")

    asyncio.run(run_test())

    assert len(requests) == 1
    request = requests[0]
    assert request.method == "POST"
    assert str(request.url) == (
        "https://project-ref.supabase.co/storage/v1/object/"
        "listing-images/listings/listing-1/photo.jpg"
    )
    assert request.headers["authorization"] == "Bearer test-service-role"
    assert request.headers["apikey"] == "test-service-role"


def test_supabase_storage_upload_sends_service_role_for_apikey_and_authorization() -> None:
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(200, json={"Key": "listing-images/listings/listing-1/photo.jpg"})

    anon_payload = base64.urlsafe_b64encode(
        json.dumps(
            {"iss": "supabase", "ref": "project-ref", "role": "anon", "iat": 1_700_000_000},
        ).encode(),
    ).decode("ascii").rstrip("=")
    anon_key = f"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.{anon_payload}.fake-signature"

    settings = Settings(
        _env_file=None,
        supabase_url="https://project-ref.supabase.co",
        supabase_anon_key=anon_key,
        supabase_service_role_key="test-service-role",
        supabase_storage_bucket="listing-images",
    )

    async def run_test() -> None:
        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(transport=transport) as http_client:
            client = SupabaseStorageClient(settings=settings, http_client=http_client)
            await client.upload_public_file(
                storage_path="listings/listing-1/photo.jpg",
                content=b"image-bytes",
                mime_type="image/jpeg",
            )

    asyncio.run(run_test())

    assert len(requests) == 1
    request = requests[0]
    assert request.headers["authorization"] == "Bearer test-service-role"
    assert request.headers["apikey"] == "test-service-role"
    assert request.headers["content-type"] == "image/jpeg"
    assert request.headers["x-upsert"] == "true"


def test_supabase_storage_rejects_malformed_service_role_jwt() -> None:
    settings = Settings(
        _env_file=None,
        supabase_url="https://project-ref.supabase.co",
        supabase_service_role_key="eyJhbGciOiJIUzI1NiJ9.15Y.not-a-signature",
        supabase_storage_bucket="listing-images",
    )

    with pytest.raises(ConfigurationError, match="SUPABASE_SERVICE_ROLE_KEY is not a valid JWT"):
        SupabaseStorageClient(settings=settings)


def test_settings_normalizes_supabase_url_secrets_and_strips_invisible_chars() -> None:
    zw = "\u200b"
    settings = Settings(
        _env_file=None,
        supabase_url="https://example.supabase.co",
        supabase_service_role_key=f"{zw}eyJhbGci.test{zw}",
    )
    assert settings.supabase_service_role_key == "eyJhbGci.test"
    settings = Settings(
        _env_file=None,
        supabase_url=" https://example.supabase.co/ ",
        supabase_service_role_key=' Bearer eyJhbGci.test ',
        supabase_anon_key='"eyJhbGciOiJhbm9uIn0.pub"',
        supabase_storage_bucket="  listing-images  ",
    )
    assert settings.supabase_url == "https://example.supabase.co"
    assert settings.supabase_service_role_key == "eyJhbGci.test"
    assert settings.supabase_anon_key == "eyJhbGciOiJhbm9uIn0.pub"
    assert settings.supabase_storage_bucket == "listing-images"


def test_storage_client_rejects_service_role_jwt_with_non_integer_iat() -> None:
    payload = base64.urlsafe_b64encode(
        b'{"iss":"supabase","ref":"proj","role":"service_role","iat":"not-a-timestamp"}',
    ).decode("ascii").rstrip("=")
    bad_token = f"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.{payload}.signature"

    with pytest.raises(ConfigurationError, match="iat"):
        SupabaseStorageClient(
            settings=Settings(
                _env_file=None,
                supabase_url="https://proj.supabase.co",
                supabase_service_role_key=bad_token,
                supabase_storage_bucket="listing-images",
            ),
        )
