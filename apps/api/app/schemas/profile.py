from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models import AppRole


class ProfileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    full_name: str | None
    avatar_url: str | None
    bio: str | None
    faculty: str | None
    year_of_study: int | None
    residential_college: str | None
    app_role: AppRole
    created_at: datetime
    updated_at: datetime


class ProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, max_length=255)
    bio: str | None = None
    faculty: str | None = Field(default=None, max_length=255)
    year_of_study: int | None = Field(default=None, ge=1, le=10)
    residential_college: str | None = Field(default=None, max_length=255)
    avatar_url: str | None = Field(default=None, max_length=500)


class RoleUpdate(BaseModel):
    app_role: AppRole
