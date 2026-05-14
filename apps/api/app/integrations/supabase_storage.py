from __future__ import annotations

import base64
import json
from dataclasses import dataclass
from typing import Any
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
        service_role = self.settings.supabase_service_role_key
        # Use the service role for both headers (Supabase Storage REST expects matching project JWTs).
        headers = {
            "Authorization": f"Bearer {service_role}",
            "apikey": service_role,
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
            body_preview = response.text[:300].replace("\n", " ").strip()
            message = f"Supabase Storage upload failed with status {response.status_code}: {body_preview}"
            lowered = body_preview.lower()
            if "signature verification" in lowered or '"unauthorized"' in lowered:
                message += (
                    " Most often the `service_role` secret in SUPABASE_SERVICE_ROLE_KEY is truncated or corrupted—"
                    "re-copy the full key from Supabase Dashboard → Project Settings → API (one line, no spaces)."
                )
            raise ExternalProviderError(message)

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

        service_claims = _decode_jwt_payload_if_jwt_shaped(
            self.settings.supabase_service_role_key,
            setting_name="SUPABASE_SERVICE_ROLE_KEY",
        )
        if service_claims is not None:
            _assert_supabase_jwt_claims(
                service_claims,
                expect_role="service_role",
                setting_name="SUPABASE_SERVICE_ROLE_KEY",
            )

        anon_key = self.settings.supabase_anon_key.strip()
        if anon_key and anon_key.count(".") == 2:
            anon_claims = _decode_jwt_payload_if_jwt_shaped(
                anon_key,
                setting_name="SUPABASE_ANON_KEY (or SUPABASE_PUBLISHABLE_KEY)",
            )
            if anon_claims is not None:
                if anon_claims.get("role") == "service_role":
                    raise ConfigurationError(
                        "SUPABASE_ANON_KEY (or SUPABASE_PUBLISHABLE_KEY) must be the anon/publishable key, "
                        "not the service_role secret."
                    )
                _assert_supabase_jwt_claims(
                    anon_claims,
                    expect_role="anon",
                    setting_name="SUPABASE_ANON_KEY (or SUPABASE_PUBLISHABLE_KEY)",
                )
                if service_claims and anon_claims.get("ref") != service_claims.get("ref"):
                    raise ConfigurationError(
                        "SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are from different Supabase projects."
                    )

        if service_claims is not None:
            configured_ref = _project_ref_from_supabase_url(self.settings.supabase_url)
            token_ref = str(service_claims.get("ref") or "")
            if configured_ref and token_ref and configured_ref != token_ref:
                raise ConfigurationError(
                    "SUPABASE_SERVICE_ROLE_KEY belongs to a different Supabase project than SUPABASE_URL."
                )


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


def _decode_jwt_payload_if_jwt_shaped(token: str, *, setting_name: str = "SUPABASE_SERVICE_ROLE_KEY") -> dict[str, Any] | None:
    parts = token.split(".")
    if len(parts) != 3:
        return None

    payload_b64 = parts[1]
    pad = "=" * ((4 - len(payload_b64) % 4) % 4)
    try:
        decoded = base64.urlsafe_b64decode((payload_b64 + pad).encode("ascii"))
        claims = json.loads(decoded.decode("utf-8"))
    except (UnicodeDecodeError, ValueError, json.JSONDecodeError) as exc:
        raise ConfigurationError(
            f"{setting_name} is not a valid JWT (truncated or corrupted paste). "
            "Supabase Dashboard → Project Settings → API → copy the full secret in one line."
        ) from exc

    if not isinstance(claims, dict):
        raise ConfigurationError(f"{setting_name} is not a valid Supabase JWT payload.")
    return claims


def _assert_supabase_jwt_claims(claims: dict[str, Any], *, expect_role: str, setting_name: str) -> None:
    if claims.get("role") != expect_role:
        raise ConfigurationError(
            f"{setting_name} must be the Supabase `{expect_role}` JWT (decoded role was {claims.get('role')!r})."
        )
    iat = claims.get("iat")
    if type(iat) is not int:
        raise ConfigurationError(
            f"{setting_name} is not a standard Supabase JWT: `iat` must be an integer Unix timestamp. "
            "The middle part of the key was likely damaged when pasting—re-copy the entire key from "
            "Project Settings → API."
        )
    ref = claims.get("ref")
    if not isinstance(ref, str) or not ref.strip():
        raise ConfigurationError(f"{setting_name} is missing a valid `ref` claim; re-copy the key from Supabase.")


def _project_ref_from_supabase_url(supabase_url: str) -> str | None:
    host = supabase_url.strip().removeprefix("https://").removeprefix("http://").split("/", 1)[0]
    suffix = ".supabase.co"
    if not host.endswith(suffix):
        return None
    return host[: -len(suffix)] or None
