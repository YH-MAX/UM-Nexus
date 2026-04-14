from sqlalchemy.orm import Session

from app.models import AppRole, Profile
from app.schemas.profile import ProfileUpdate


def update_profile(db: Session, profile: Profile, payload: ProfileUpdate) -> Profile:
    for field_name, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field_name, value)

    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


def update_profile_role(db: Session, profile: Profile, app_role: AppRole) -> Profile:
    profile.app_role = app_role
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile
