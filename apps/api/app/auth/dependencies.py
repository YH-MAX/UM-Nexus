from __future__ import annotations

from collections.abc import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.auth.jwt import TokenClaims, TokenVerificationError, get_token_verifier
from app.db.session import get_db
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
        return verifier.verify_access_token(credentials.credentials)
    except TokenVerificationError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc


def require_authenticated_user(
    token_claims: TokenClaims = Depends(get_token_claims),
    db: Session = Depends(get_db),
) -> User:
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
    db: Session = Depends(get_db),
) -> User | None:
    if credentials is None or credentials.scheme.lower() != "bearer":
        return None
    try:
        token_claims = verifier.verify_access_token(credentials.credentials)
    except TokenVerificationError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc
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
