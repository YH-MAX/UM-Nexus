from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.services.trade_policy import normalize_category, normalize_pickup_location
from app.trade.constants import PickupArea, TradeCategory


class WantedPostCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    category: TradeCategory
    desired_item_name: str | None = Field(default=None, max_length=255)
    max_budget: float | None = Field(default=None, gt=0)
    currency: str = Field(default="MYR", min_length=3, max_length=3)
    preferred_pickup_area: PickupArea | None = None
    residential_college: str | None = Field(default=None, max_length=255)

    @field_validator("category", mode="before")
    @classmethod
    def normalize_category_value(cls, value: object) -> object:
        return normalize_category(value) or value

    @field_validator("preferred_pickup_area", mode="before")
    @classmethod
    def normalize_pickup_value(cls, value: object) -> object:
        return normalize_pickup_location(value)


class WantedPostRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    buyer_id: str
    title: str
    description: str | None
    category: str
    desired_item_name: str | None
    max_budget: float | None
    currency: str
    preferred_pickup_area: str | None
    residential_college: str | None
    status: str
    created_at: datetime
    updated_at: datetime
