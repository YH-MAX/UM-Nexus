import asyncio

import httpx

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
    assert request.headers["content-type"] == "image/jpeg"
    assert request.headers["x-upsert"] == "true"
