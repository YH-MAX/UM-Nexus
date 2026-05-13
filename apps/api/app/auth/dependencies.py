from __future__ import annotations

from collections.abc import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.auth.jwt import TokenClaims, TokenVerificationError, get_token_verifier
from app.core.exceptions import ConfigurationError, ExternalProviderError
from app.db.session import get_db
from app.integrations.supabase_auth import (
    SupabaseAuthTokenError,
    SupabaseAuthUserClient,
    get_supabase_auth_user_client,
)
from app.models import AppRole, User
from app.services.user_sync import ensure_local_user


bearer_scheme = HTTPBearer(auto_error=False)

ROLE_ORDER = {
    AppRole.STUDENT: 10,
    AppRole.ORGANIZER: 20,
    AppRole.MODERATOR: 30,
    AppRole.ADMIN: 40,
}


def get_token_claims(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    verifier=Depends(get_token_verifier),
) -> TokenClaims:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided.",
        )

    try:
        claims = verifier.verify_access_token(credentials.credentials)
        claims.access_token = credentials.credentials
        return claims
    except TokenVerificationError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc


def require_authenticated_user(
    token_claims: TokenClaims = Depends(get_token_claims),
    supabase_auth_user_client: SupabaseAuthUserClient = Depends(get_supabase_auth_user_client),
    db: Session = Depends(get_db),
) -> User:
    ensure_confirmed_supabase_email(token_claims, supabase_auth_user_client)
    user = ensure_local_user(db, token_claims)
    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your UM Nexus account is suspended or banned.",
        )
    return user


def get_optional_authenticated_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    verifier=Depends(get_token_verifier),
    supabase_auth_user_client: SupabaseAuthUserClient = Depends(get_supabase_auth_user_client),
    db: Session = Depends(get_db),
) -> User | None:
    if credentials is None or credentials.scheme.lower() != "bearer":
        return None
    try:
        token_claims = verifier.verify_access_token(credentials.credentials)
        token_claims.access_token = credentials.credentials
    except TokenVerificationError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc
    ensure_confirmed_supabase_email(token_claims, supabase_auth_user_client)
    return ensure_local_user(db, token_claims)


def require_app_role(required_role: AppRole | str) -> Callable[..., User]:
    normalized_required_role = AppRole(required_role)

    def dependency(current_user: User = Depends(require_authenticated_user)) -> User:
        if ROLE_ORDER[current_user.profile.app_role] < ROLE_ORDER[normalized_required_role]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action.",
            )
        return current_user

    return dependency


def ensure_confirmed_supabase_email(
    token_claims: TokenClaims,
    supabase_auth_user_client: SupabaseAuthUserClient,
) -> None:
    access_token = token_claims.access_token
    if access_token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Supabase access token is required.",
        )

    try:
        supabase_user = supabase_auth_user_client.get_user(access_token)
    except SupabaseAuthTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Supabase session is no longer valid. Please sign in again.",
        ) from exc
    except (ConfigurationError, ExternalProviderError) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to verify your Supabase Auth account right now.",
        ) from exc

    if supabase_user.id != str(token_claims.sub):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Supabase session user does not match the access token.",
        )

    normalized_supabase_email = (supabase_user.email or "").strip().lower()
    if normalized_supabase_email != token_claims.email.lower():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Supabase session email does not match the access token.",
        )

    if not supabase_user.has_confirmed_email:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Confirm your UM email address before accessing UM Nexus.",
        )
