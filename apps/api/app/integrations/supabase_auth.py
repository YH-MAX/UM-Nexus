from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import httpx

from app.core.config import Settings, get_settings
from app.core.exceptions import ConfigurationError, ExternalProviderError


class SupabaseAuthTokenError(Exception):
    """Raised when Supabase rejects the current user's access token."""


@dataclass(frozen=True)
class SupabaseAuthUser:
    id: str
    email: str | None
    email_confirmed_at: str | None

    @property
    def has_confirmed_email(self) -> bool:
        return bool(self.email_confirmed_at)


class SupabaseAuthUserClient:
    """Backend Supabase Auth client for checking the signed-in user's status."""

    def __init__(
        self,
        settings: Settings | None = None,
        http_client: httpx.Client | None = None,
    ) -> None:
        self.settings = settings or get_settings()
        self._http_client = http_client

    def get_user(self, access_token: str) -> SupabaseAuthUser:
        if not access_token.strip():
            raise SupabaseAuthTokenError("Missing Supabase access token.")

        self._validate_settings()
        headers = {
            "Authorization": f"Bearer {access_token}",
            "apikey": self._api_key,
        }

        owns_client = self._http_client is None
        client = self._http_client or httpx.Client(timeout=10)
        try:
            response = client.get(self._user_url, headers=headers)
        except httpx.HTTPError as exc:
            raise ExternalProviderError("Unable to reach Supabase Auth.") from exc
        finally:
            if owns_client:
                client.close()

        if response.status_code in {401, 403}:
            raise SupabaseAuthTokenError("Supabase Auth rejected the access token.")

        if response.status_code >= 400:
            body_preview = response.text[:300].replace("\n", " ").strip()
            raise ExternalProviderError(
                f"Supabase Auth user lookup failed with status {response.status_code}: {body_preview}"
            )

        try:
            payload = response.json()
        except ValueError as exc:
            raise ExternalProviderError("Supabase Auth returned an invalid user response.") from exc

        return _parse_supabase_auth_user(payload)

    @property
    def _user_url(self) -> str:
        return f"{self.settings.supabase_url.rstrip('/')}/auth/v1/user"

    @property
    def _api_key(self) -> str:
        return self.settings.supabase_anon_key.strip() or self.settings.supabase_service_role_key.strip()

    def _validate_settings(self) -> None:
        missing: list[str] = []
        if not self.settings.supabase_url.strip():
            missing.append("SUPABASE_URL")
        if not self._api_key:
            missing.append("SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY")
        if missing:
            joined = ", ".join(missing)
            raise ConfigurationError(f"Missing required Supabase Auth settings: {joined}.")


def get_supabase_auth_user_client() -> SupabaseAuthUserClient:
    return SupabaseAuthUserClient()


def _parse_supabase_auth_user(payload: dict[str, Any]) -> SupabaseAuthUser:
    user_id = payload.get("id")
    if not isinstance(user_id, str) or not user_id.strip():
        raise ExternalProviderError("Supabase Auth user response did not include a user id.")

    email = payload.get("email")
    email_confirmed_at = payload.get("email_confirmed_at")
    return SupabaseAuthUser(
        id=user_id,
        email=email if isinstance(email, str) else None,
        email_confirmed_at=email_confirmed_at if isinstance(email_confirmed_at, str) else None,
    )
