from pydantic import BaseModel, ConfigDict, EmailStr, Field


class BetaStatusRead(BaseModel):
    signup_open: bool
    current_users: int
    max_users: int


class BetaWaitlistCreate(BaseModel):
    email: EmailStr
    reason: str | None = Field(default=None, max_length=1000)


class BetaWaitlistRead(BaseModel):
    id: str
    email: EmailStr
    reason: str | None

    model_config = ConfigDict(from_attributes=True)
