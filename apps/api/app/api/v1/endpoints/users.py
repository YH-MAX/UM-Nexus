from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_app_role, require_authenticated_user
from app.db.session import get_db
from app.models import AppRole, Profile
from app.schemas.profile import ProfileRead, ProfileUpdate, RoleUpdate
from app.services.profile_service import update_profile, update_profile_role


router = APIRouter()


@router.patch("/me/profile", response_model=ProfileRead)
def update_my_profile(
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_authenticated_user),
) -> ProfileRead:
    profile = update_profile(db, current_user.profile, payload)
    return ProfileRead.model_validate(profile)


@router.patch("/{user_id}/role", response_model=ProfileRead)
def update_user_role(
    user_id: UUID,
    payload: RoleUpdate,
    db: Session = Depends(get_db),
    _admin=Depends(require_app_role(AppRole.ADMIN)),
) -> ProfileRead:
    profile = db.query(Profile).filter(Profile.user_id == str(user_id)).one_or_none()
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    updated_profile = update_profile_role(db, profile, payload.app_role)
    return ProfileRead.model_validate(updated_profile)
