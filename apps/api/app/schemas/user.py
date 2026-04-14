from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.profile import ProfileRead


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    username: str | None
    status: str
    created_at: datetime
    updated_at: datetime


class CurrentUserResponse(BaseModel):
    user: UserRead
    profile: ProfileRead
