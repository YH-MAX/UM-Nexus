from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.services.trade_policy import (
    normalize_category,
    normalize_condition,
    normalize_contact_method,
    normalize_listing_report_reason,
    normalize_listing_status,
    normalize_pickup_location,
    normalize_report_status,
)
from app.trade.constants import ConditionLabel, ContactMethod, ListingReportReason, ListingStatus, PickupArea, TradeCategory


class ListingImageCreate(BaseModel):
    storage_path: str = Field(..., min_length=1, max_length=500)
    public_url: str | None = Field(default=None, max_length=500)
    content_hash: str | None = Field(default=None, max_length=128)
    sort_order: int = Field(default=0, ge=0)
    is_primary: bool = False


class ListingImageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    listing_id: str
    storage_path: str
    public_url: str | None
    content_hash: str | None
    sort_order: int
    is_primary: bool
    created_at: datetime


class SellerProfileSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    full_name: str | None = None
    display_name: str | None = None
    faculty: str | None = None
    residential_college: str | None = None
    college_or_location: str | None = None


class SellerSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    username: str | None = None
    status: str
    profile: SellerProfileSummary | None = None


class ListingCreate(BaseModel):
    title: str | None = Field(default=None, max_length=100)
    description: str | None = Field(default=None, max_length=2000)
    category: TradeCategory = "others"
    item_name: str | None = Field(default=None, max_length=255)
    brand: str | None = Field(default=None, max_length=255)
    model: str | None = Field(default=None, max_length=255)
    condition: ConditionLabel | None = Field(default=None, max_length=64)
    condition_label: ConditionLabel | None = Field(default=None, max_length=64)
    price: float = Field(default=0, ge=0)
    original_price: float | None = Field(default=None, ge=0)
    currency: str = Field(default="MYR", min_length=3, max_length=3)
    pickup_location: PickupArea | None = None
    pickup_area: PickupArea | None = None
    pickup_note: str | None = Field(default=None, max_length=500)
    residential_college: str | None = Field(default=None, max_length=255)
    contact_method: ContactMethod | None = None
    contact_value: str | None = Field(default=None, max_length=255)
    source_wanted_post_id: str | None = Field(default=None, max_length=64)

    @model_validator(mode="before")
    @classmethod
    def copy_legacy_aliases(cls, data: object) -> object:
        if isinstance(data, dict):
            values = dict(data)
            if values.get("condition") is None and values.get("condition_label") is not None:
                values["condition"] = values["condition_label"]
            if values.get("condition_label") is None and values.get("condition") is not None:
                values["condition_label"] = values["condition"]
            if values.get("pickup_location") is None and values.get("pickup_area") is not None:
                values["pickup_location"] = values["pickup_area"]
            if values.get("pickup_area") is None and values.get("pickup_location") is not None:
                values["pickup_area"] = values["pickup_location"]
            return values
        return data

    @field_validator("category", mode="before")
    @classmethod
    def normalize_category_value(cls, value: object) -> object:
        return normalize_category(value) or value

    @field_validator("condition_label", mode="before")
    @classmethod
    def normalize_condition_value(cls, value: object) -> object:
        return normalize_condition(value)

    @field_validator("condition", mode="before")
    @classmethod
    def normalize_condition_alias_value(cls, value: object) -> object:
        return normalize_condition(value)

    @field_validator("pickup_location", "pickup_area", mode="before")
    @classmethod
    def normalize_pickup_value(cls, value: object) -> object:
        return normalize_pickup_location(value)

    @field_validator("contact_method", mode="before")
    @classmethod
    def normalize_contact_method_value(cls, value: object) -> object:
        return normalize_contact_method(value)


class ListingUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=5, max_length=100)
    description: str | None = Field(default=None, min_length=10, max_length=2000)
    category: TradeCategory | None = None
    item_name: str | None = Field(default=None, max_length=255)
    brand: str | None = Field(default=None, max_length=255)
    model: str | None = Field(default=None, max_length=255)
    condition: ConditionLabel | None = Field(default=None, max_length=64)
    condition_label: ConditionLabel | None = Field(default=None, max_length=64)
    price: float | None = Field(default=None, ge=0)
    original_price: float | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    pickup_location: PickupArea | None = None
    pickup_area: PickupArea | None = None
    pickup_note: str | None = Field(default=None, max_length=500)
    residential_college: str | None = Field(default=None, max_length=255)
    contact_method: ContactMethod | None = None
    contact_value: str | None = Field(default=None, max_length=255)
    status: ListingStatus | None = Field(default=None, max_length=32)
    source_wanted_post_id: str | None = Field(default=None, max_length=64)

    @model_validator(mode="before")
    @classmethod
    def copy_legacy_aliases(cls, data: object) -> object:
        if isinstance(data, dict):
            values = dict(data)
            if values.get("condition") is None and values.get("condition_label") is not None:
                values["condition"] = values["condition_label"]
            if values.get("condition_label") is None and values.get("condition") is not None:
                values["condition_label"] = values["condition"]
            if values.get("pickup_location") is None and values.get("pickup_area") is not None:
                values["pickup_location"] = values["pickup_area"]
            if values.get("pickup_area") is None and values.get("pickup_location") is not None:
                values["pickup_area"] = values["pickup_location"]
            return values
        return data

    @field_validator("category", mode="before")
    @classmethod
    def normalize_category_value(cls, value: object) -> object:
        return normalize_category(value) or value

    @field_validator("condition_label", mode="before")
    @classmethod
    def normalize_condition_value(cls, value: object) -> object:
        return normalize_condition(value)

    @field_validator("condition", mode="before")
    @classmethod
    def normalize_condition_alias_value(cls, value: object) -> object:
        return normalize_condition(value)

    @field_validator("pickup_location", "pickup_area", mode="before")
    @classmethod
    def normalize_pickup_value(cls, value: object) -> object:
        return normalize_pickup_location(value)

    @field_validator("contact_method", mode="before")
    @classmethod
    def normalize_contact_method_value(cls, value: object) -> object:
        return normalize_contact_method(value)

    @field_validator("status", mode="before")
    @classmethod
    def normalize_status_value(cls, value: object) -> object:
        return normalize_listing_status(value)


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
    condition: str | None = None
    price: float
    original_price: float | None = None
    currency: str
    pickup_area: str | None
    pickup_location: str | None = None
    pickup_note: str | None = None
    residential_college: str | None
    contact_method: str | None
    source_wanted_post_id: str | None = None
    sold_source: str | None = None
    sold_contact_request_id: str | None = None
    status: str
    view_count: int = 0
    hidden_at: datetime | None = None
    hidden_by: str | None = None
    hidden_reason: str | None = None
    deleted_at: datetime | None = None
    deleted_by: str | None = None
    deleted_reason: str | None = None
    risk_score: float
    risk_level: str | None
    risk_evidence: dict | None
    moderation_status: str
    suggested_listing_price: float | None
    minimum_acceptable_price: float | None
    accepted_recommended_price: float | None
    recommendation_applied_at: datetime | None
    ai_explanation_cache: dict | None
    is_ai_enriched: bool
    created_at: datetime
    updated_at: datetime
    images: list[ListingImageRead] = Field(default_factory=list)
    seller: SellerSummary | None = None


class ListingReportCreate(BaseModel):
    report_type: ListingReportReason = Field(..., min_length=1, max_length=100)
    reason: str | None = Field(default=None, max_length=2000)

    @field_validator("report_type", mode="before")
    @classmethod
    def normalize_report_type_value(cls, value: object) -> object:
        return normalize_listing_report_reason(value) or value


class ListingReportReview(BaseModel):
    status: str = Field(..., min_length=1, max_length=32)
    moderation_status: str | None = Field(default=None, max_length=32)
    resolution: str | None = Field(default=None, max_length=2000)

    @field_validator("status", mode="before")
    @classmethod
    def normalize_report_status_value(cls, value: object) -> object:
        return normalize_report_status(value) or value


class ListingReportRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    listing_id: str
    reporter_user_id: str | None
    report_type: str
    reason: str | None
    status: str
    moderator_user_id: str | None
    resolution: str | None
    reviewed_at: datetime | None
    created_at: datetime


class ListingFavoriteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    listing_id: str
    created_at: datetime
    updated_at: datetime
    listing: ListingRead | None = None


class ListingStatusUpdate(BaseModel):
    status: ListingStatus
    reason: str | None = Field(default=None, max_length=2000)
    sold_source: str | None = Field(default=None, max_length=64)
    sold_contact_request_id: str | None = Field(default=None, max_length=64)
    agreed_price: float | None = Field(default=None, ge=0)

    @field_validator("status", mode="before")
    @classmethod
    def normalize_status_value(cls, value: object) -> object:
        return normalize_listing_status(value)
