from sqlalchemy.orm import Session

from app.models import AppRole, Profile
from app.schemas.profile import ProfileUpdate


def update_profile(db: Session, profile: Profile, payload: ProfileUpdate) -> Profile:
    values = payload.model_dump(exclude_unset=True)
    if "full_name" in values and "display_name" not in values:
        values["display_name"] = values["full_name"]
    if "display_name" in values and "full_name" not in values and not profile.full_name:
        values["full_name"] = values["display_name"]
    if "residential_college" in values and "college_or_location" not in values:
        values["college_or_location"] = values["residential_college"]
    if "college_or_location" in values and "residential_college" not in values and not profile.residential_college:
        values["residential_college"] = values["college_or_location"]

    for field_name, value in values.items():
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
