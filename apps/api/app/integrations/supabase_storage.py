from __future__ import annotations

from dataclasses import dataclass
from urllib.parse import quote

import httpx

from app.core.config import Settings, get_settings
from app.core.exceptions import ConfigurationError, ExternalProviderError


@dataclass(frozen=True)
class SupabaseStoredFile:
    storage_bucket: str
    storage_path: str
    public_url: str
    mime_type: str
    file_size: int


class SupabaseStorageClient:
    """Backend-only Supabase Storage client using the Storage REST API."""

    def __init__(
        self,
        settings: Settings | None = None,
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        self.settings = settings or get_settings()
        self._http_client = http_client
        self._validate_settings()

    @property
    def bucket_name(self) -> str:
        return self.settings.supabase_storage_bucket

    async def upload_public_file(
        self,
        *,
        storage_path: str,
        content: bytes,
        mime_type: str,
    ) -> SupabaseStoredFile:
        if not content:
            raise ExternalProviderError("Cannot upload an empty file to Supabase Storage.")

        normalized_path = _normalize_storage_path(storage_path)
        upload_url = self._object_url(normalized_path)
        headers = {
            "Authorization": f"Bearer {self.settings.supabase_service_role_key}",
            "apikey": self.settings.supabase_service_role_key,
            "Content-Type": mime_type,
            "x-upsert": "true",
        }

        owns_client = self._http_client is None
        client = self._http_client or httpx.AsyncClient(timeout=30)
        try:
            response = await client.post(upload_url, content=content, headers=headers)
        finally:
            if owns_client:
                await client.aclose()

        if response.status_code not in {200, 201}:
            raise ExternalProviderError(
                f"Supabase Storage upload failed with status {response.status_code}."
            )

        return SupabaseStoredFile(
            storage_bucket=self.bucket_name,
            storage_path=normalized_path,
            public_url=self.public_url_for(normalized_path),
            mime_type=mime_type,
            file_size=len(content),
        )

    def public_url_for(self, storage_path: str) -> str:
        return (
            f"{self.settings.supabase_url.rstrip('/')}/storage/v1/object/public/"
            f"{quote(self.bucket_name, safe='')}/{_quote_storage_path(storage_path)}"
        )

    def _object_url(self, storage_path: str) -> str:
        return (
            f"{self.settings.supabase_url.rstrip('/')}/storage/v1/object/"
            f"{quote(self.bucket_name, safe='')}/{_quote_storage_path(storage_path)}"
        )

    def _validate_settings(self) -> None:
        missing: list[str] = []
        if not self.settings.supabase_url.strip():
            missing.append("SUPABASE_URL")
        if not self.settings.supabase_service_role_key.strip():
            missing.append("SUPABASE_SERVICE_ROLE_KEY")
        if not self.settings.supabase_storage_bucket.strip():
            missing.append("SUPABASE_STORAGE_BUCKET")
        if missing:
            joined = ", ".join(missing)
            raise ConfigurationError(f"Missing required Supabase Storage settings: {joined}.")


async def upload_listing_image_to_supabase(
    *,
    storage_path: str,
    content: bytes,
    mime_type: str,
    settings: Settings | None = None,
) -> SupabaseStoredFile:
    client = SupabaseStorageClient(settings=settings)
    return await client.upload_public_file(
        storage_path=storage_path,
        content=content,
        mime_type=mime_type,
    )


def _normalize_storage_path(storage_path: str) -> str:
    parts = [part for part in storage_path.replace("\\", "/").split("/") if part not in {"", ".", ".."}]
    if not parts:
        raise ValueError("Supabase Storage path cannot be empty.")
    return "/".join(parts)


def _quote_storage_path(storage_path: str) -> str:
    return "/".join(quote(part, safe="") for part in _normalize_storage_path(storage_path).split("/"))

