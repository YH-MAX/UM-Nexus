from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.listing import ListingRead
from app.services.trade_policy import normalize_category, normalize_pickup_location
from app.services.trade_policy import normalize_contact_method
from app.trade.constants import ContactMethod, PickupArea, TradeCategory


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


class WantedPostPage(BaseModel):
    items: list[WantedPostRead]
    total: int
    limit: int
    offset: int
    has_more: bool


class WantedPostStatusUpdate(BaseModel):
    status: Literal["active", "closed"]


class WantedResponseCreate(BaseModel):
    message: str | None = Field(default=None, max_length=2000)
    seller_contact_method: ContactMethod
    seller_contact_value: str | None = Field(default=None, max_length=255)
    listing_id: str | None = Field(default=None, max_length=64)

    @field_validator("seller_contact_method", mode="before")
    @classmethod
    def normalize_contact_method_value(cls, value: object) -> object:
        return normalize_contact_method(value) or value


class WantedResponseDecision(BaseModel):
    status: Literal["accepted", "rejected"]
    buyer_response: str | None = Field(default=None, max_length=2000)


class WantedResponseRead(BaseModel):
    id: str
    wanted_post_id: str
    seller_id: str
    buyer_id: str
    listing_id: str | None = None
    message: str | None = None
    seller_contact_method: str
    seller_contact_value: str | None = None
    contact_reveal_blocked_reason: str | None = None
    status: str
    buyer_response: str | None = None
    accepted_at: datetime | None = None
    rejected_at: datetime | None = None
    cancelled_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    wanted_post: WantedPostRead | None = None
    listing: ListingRead | None = None
