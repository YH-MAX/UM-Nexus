from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.trade.constants import PickupArea, TradeCategory


class ListingImageCreate(BaseModel):
    storage_path: str = Field(..., min_length=1, max_length=500)
    public_url: str | None = Field(default=None, max_length=500)
    sort_order: int = Field(default=0, ge=0)
    is_primary: bool = False


class ListingImageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    listing_id: str
    storage_path: str
    public_url: str | None
    sort_order: int
    is_primary: bool
    created_at: datetime


class ListingCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    category: TradeCategory
    item_name: str | None = Field(default=None, max_length=255)
    brand: str | None = Field(default=None, max_length=255)
    model: str | None = Field(default=None, max_length=255)
    condition_label: str | None = Field(default=None, max_length=64)
    price: float = Field(..., gt=0)
    currency: str = Field(default="MYR", min_length=3, max_length=3)
    pickup_area: PickupArea | None = None
    residential_college: str | None = Field(default=None, max_length=255)


class ListingUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    category: TradeCategory | None = None
    item_name: str | None = Field(default=None, max_length=255)
    brand: str | None = Field(default=None, max_length=255)
    model: str | None = Field(default=None, max_length=255)
    condition_label: str | None = Field(default=None, max_length=64)
    price: float | None = Field(default=None, gt=0)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    pickup_area: PickupArea | None = None
    residential_college: str | None = Field(default=None, max_length=255)
    status: str | None = Field(default=None, max_length=32)


class ListingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    seller_id: str
    title: str
    description: str | None
    category: str
    item_name: str | None
    brand: str | None
    model: str | None
    condition_label: str | None
    price: float
    currency: str
    pickup_area: str | None
    residential_college: str | None
    status: str
    risk_score: float
    risk_level: str | None
    suggested_listing_price: float | None
    minimum_acceptable_price: float | None
    ai_explanation_cache: dict | None
    is_ai_enriched: bool
    created_at: datetime
    updated_at: datetime
    images: list[ListingImageRead] = Field(default_factory=list)
