from __future__ import annotations

from functools import lru_cache
from typing import Any
from uuid import UUID

import jwt
from jwt import InvalidTokenError, PyJWKClient
from pydantic import BaseModel, EmailStr, ValidationError

from app.core.config import Settings, get_settings


class TokenVerificationError(Exception):
    """Raised when a Supabase access token cannot be verified."""


class TokenClaims(BaseModel):
    sub: UUID
    email: EmailStr
    role: str | None = None


class SupabaseJWTVerifier:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._jwks_client = PyJWKClient(settings.resolved_supabase_jwks_url)
        self._expected_issuer = f"{settings.supabase_url.rstrip('/')}/auth/v1"

    def verify_access_token(self, token: str) -> TokenClaims:
        try:
            header = jwt.get_unverified_header(token)
            algorithm = header.get("alg", "RS256")
            if algorithm not in {"RS256", "ES256"}:
                raise TokenVerificationError("Unsupported token algorithm.")

            signing_key = self._jwks_client.get_signing_key_from_jwt(token)
            payload: dict[str, Any] = jwt.decode(
                token,
                signing_key.key,
                algorithms=[algorithm],
                issuer=self._expected_issuer,
                leeway=60,
                options={"verify_aud": False},
            )
            return TokenClaims.model_validate(payload)
        except (InvalidTokenError, ValidationError) as exc:
            raise TokenVerificationError("Invalid Supabase access token.") from exc


@lru_cache
def get_token_verifier() -> SupabaseJWTVerifier:
    return SupabaseJWTVerifier(get_settings())
