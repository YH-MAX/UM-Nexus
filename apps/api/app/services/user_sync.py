from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.auth.jwt import TokenClaims
from app.core.config import get_settings
from app.models import AppRole, Profile, User


def ensure_allowed_email_domain(email: str) -> None:
    settings = get_settings()
    domain = email.rsplit("@", 1)[-1].strip().lower()

    if domain not in settings.allowed_email_domains:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only University of Malaya email addresses can access UM Nexus.",
        )


def is_beta_invited_email(email: str) -> bool:
    settings = get_settings()
    return email.strip().lower() in settings.beta_invite_emails


def get_beta_user_count(db: Session) -> int:
    return db.scalar(select(func.count()).select_from(User)) or 0


def get_beta_signup_status(db: Session) -> dict[str, int | bool]:
    settings = get_settings()
    current_users = get_beta_user_count(db)
    max_users = settings.beta_max_users
    signup_open = max_users <= 0 or current_users < max_users
    return {
        "signup_open": signup_open,
        "current_users": current_users,
        "max_users": max_users,
    }


def ensure_beta_capacity(db: Session, email: str) -> None:
    settings = get_settings()
    max_users = settings.beta_max_users

    if max_users <= 0 or is_beta_invited_email(email):
        return

    if get_beta_user_count(db) >= max_users:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="UM Nexus beta is currently full. Please join the waitlist.",
        )


def ensure_local_user(db: Session, token_claims: TokenClaims) -> User:
    normalized_email = token_claims.email.lower()
    ensure_allowed_email_domain(normalized_email)

    stmt = (
        select(User)
        .options(selectinload(User.profile))
        .where(User.id == str(token_claims.sub))
    )
    user = db.scalar(stmt)

    if user is None:
        ensure_beta_capacity(db, normalized_email)
        user = User(
            id=str(token_claims.sub),
            email=normalized_email,
        )
        user.profile = Profile(app_role=AppRole.STUDENT, verified_um_email=True)
        db.add(user)
        db.commit()
        db.refresh(user)
        return db.scalar(stmt) or user

    if user.email != normalized_email:
        user.email = normalized_email

    if user.profile is None:
        user.profile = Profile(app_role=AppRole.STUDENT, verified_um_email=True)
    else:
        user.profile.verified_um_email = True

    db.add(user)
    db.commit()
    db.refresh(user)
    return db.scalar(stmt) or user
