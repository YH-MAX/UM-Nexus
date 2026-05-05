from datetime import UTC, datetime, timedelta
from decimal import Decimal
from hashlib import sha256

from fastapi import HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import (
    AppRole,
    HistoricalSale,
    Listing,
    ListingImage,
    ListingReport,
    ListingFavorite,
    TradeContactRequest,
    TradeDecisionFeedback,
    TradeMatch,
    TradeTransaction,
    User,
    UserReport,
    WantedPost,
)
from app.repositories.trade import TradeRepository
from app.schemas.listing import (
    ListingFavoriteRead,
    ListingCreate,
    ListingImageCreate,
    ListingRead,
    ListingReportCreate,
    ListingReportReview,
    ListingStatusUpdate,
    ListingUpdate,
)
from app.schemas.trade_product import (
    AISettingsRead,
    AISettingsUpdate,
    AdminListingUpdate,
    AdminUserRoleUpdate,
    AdminUserStatusUpdate,
    ContactMatchCreate,
    ContactRequestCreate,
    ContactRequestDecision,
    ContactRequestRead,
    DecisionFeedbackCreate,
    ProductEventCreate,
    TradeTransactionUpdate,
    TradeCategoryCreate,
    TradeCategoryUpdate,
    UserReportCreate,
)
from app.schemas.wanted_post import WantedPostCreate
from app.services.demo_user import get_or_create_demo_user
from app.services.storage_service import store_listing_image_upload
from app.services.trade_policy import (
    normalize_category,
    normalize_condition,
    normalize_listing_status,
    normalize_pickup_location,
    normalize_listing_report_reason,
    normalize_report_status,
    scan_listing_policy,
)
from app.trade.constants import TRADE_CATEGORIES


def create_listing(
    db: Session,
    payload: ListingCreate,
    current_user: User | None = None,
    *,
    publish: bool = False,
    require_profile: bool = True,
) -> Listing:
    owner = current_user or get_or_create_demo_user(db)
    if publish and require_profile:
        _ensure_profile_ready(owner)
    repo = TradeRepository(db)
    values = _prepare_listing_values(payload.model_dump(), for_publish=publish and require_profile)
    if publish:
        values["status"] = values.get("status") if values.get("status") == "hidden" else "available"
    else:
        values["status"] = "draft"
    listing = repo.create_listing(owner.id, values)
    if publish:
        _refresh_matches_for_listing(db, listing.id)
    return listing


def list_listings(
    db: Session,
    *,
    category: str | None = None,
    search: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    pickup_area: str | None = None,
    pickup_location: str | None = None,
    risk_level: str | None = None,
    condition: str | None = None,
    status: str | None = None,
    sort: str = "latest",
) -> list[Listing]:
    repo = TradeRepository(db)
    normalized_status = normalize_listing_status(status) if status else None
    normalized_condition = normalize_condition(condition) if condition else None
    normalized_pickup = normalize_pickup_location(pickup_location or pickup_area) if (pickup_location or pickup_area) else None
    return list(
        repo.list_listings(
            status=normalized_status,
            category=normalize_category(category) if category else None,
            condition=normalized_condition,
            search=search,
            min_price=min_price,
            max_price=max_price,
            pickup_location=normalized_pickup,
            risk_level=risk_level,
            sort=sort,
        )
    )


def get_listing(
    db: Session,
    listing_id: str,
    *,
    viewer: User | None = None,
    request: Request | None = None,
    increment_view: bool = False,
) -> Listing:
    repo = TradeRepository(db)
    listing = repo.get_listing_or_none(listing_id)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    if not _can_view_listing(listing, viewer):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    if increment_view and listing.status in {"available", "reserved", "sold"}:
        repo.record_listing_view(
            listing=listing,
            viewer_user_id=viewer.id if viewer else None,
            viewer_fingerprint=_viewer_fingerprint(request, viewer),
        )
        refreshed = repo.get_listing_or_none(listing.id)
        if refreshed is not None:
            return refreshed
    return listing


def update_listing(db: Session, listing_id: str, payload: ListingUpdate, current_user: User | None = None) -> Listing:
    if current_user is None:
        get_or_create_demo_user(db)
    repo = TradeRepository(db)
    listing = repo.get_listing_or_none(listing_id)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    if current_user is not None and listing.seller_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the seller can update this listing.")

    values = _prepare_listing_values(payload.model_dump(exclude_unset=True), existing=listing, for_publish=False)
    if listing.status == "sold" and _contains_locked_sold_fields(values):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Sold listings can only change status or moderation metadata.",
        )
    if values.get("status"):
        _apply_listing_status_transition(listing, values["status"], current_user)
    updated = repo.update_listing(listing, values)
    if updated.status in {"sold", "hidden", "deleted"}:
        repo.expire_pending_contact_requests(updated.id)
    if {"title", "description", "category", "item_name", "brand", "model", "condition_label", "price", "pickup_area", "pickup_location", "residential_college"} & set(values):
        _refresh_matches_for_listing(db, updated.id)
    return updated


def publish_listing(db: Session, listing_id: str, current_user: User) -> Listing:
    _ensure_profile_ready(current_user)
    repo = TradeRepository(db)
    listing = repo.get_listing_or_none(listing_id)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    if listing.seller_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the seller can publish this listing.")
    values = _prepare_listing_values(_listing_payload_for_validation(listing), existing=listing, for_publish=True)
    values["status"] = values.get("status") if values.get("status") == "hidden" else "available"
    updated = repo.update_listing(listing, values)
    _refresh_matches_for_listing(db, updated.id)
    return updated


def update_listing_status(
    db: Session,
    listing_id: str,
    payload: ListingStatusUpdate,
    current_user: User,
) -> Listing:
    repo = TradeRepository(db)
    listing = repo.get_listing_or_none(listing_id)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    if listing.seller_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the seller can change this listing status.")
    if payload.status not in {"available", "reserved", "sold", "hidden", "deleted"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid seller listing status.")
    values = {"status": payload.status}
    _apply_listing_status_transition(listing, payload.status, current_user, reason=payload.reason)
    updated = repo.update_listing(listing, values)
    if updated.status in {"sold", "hidden", "deleted"}:
        repo.expire_pending_contact_requests(updated.id)
    return updated


def delete_listing(db: Session, listing_id: str, current_user: User) -> Listing:
    return update_listing_status(
        db,
        listing_id,
        ListingStatusUpdate(status="deleted", reason="Seller deleted listing."),
        current_user,
    )


def list_favorites(db: Session, current_user: User) -> list[ListingFavorite]:
    return [
        favorite
        for favorite in TradeRepository(db).list_favorites_for_user(current_user.id)
        if favorite.listing and favorite.listing.status not in {"draft", "hidden", "deleted"}
    ]


def add_favorite(db: Session, listing_id: str, current_user: User) -> ListingFavorite:
    repo = TradeRepository(db)
    listing = repo.get_listing_or_none(listing_id)
    if listing is None or listing.status in {"draft", "deleted", "hidden"}:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    return repo.create_favorite(current_user.id, listing.id)


def remove_favorite(db: Session, listing_id: str, current_user: User) -> None:
    repo = TradeRepository(db)
    favorite = repo.get_favorite_or_none(current_user.id, listing_id)
    if favorite is not None:
        repo.delete_favorite(favorite)


def add_listing_image(db: Session, listing_id: str, payload: ListingImageCreate, current_user: User | None = None) -> ListingImage:
    if current_user is None:
        get_or_create_demo_user(db)
    repo = TradeRepository(db)
    listing = repo.get_listing_or_none(listing_id)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    if current_user is not None and listing.seller_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the seller can add listing images.")
    if listing.status == "sold":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Sold listings cannot be edited.")
    if len(listing.images) >= 5:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A listing can have at most 5 images.")

    return repo.add_listing_image(listing.id, payload.model_dump())


async def add_uploaded_listing_image(
    db: Session,
    listing_id: str,
    upload_file: UploadFile,
    current_user: User | None = None,
    sort_order: int = 0,
    is_primary: bool = False,
) -> ListingImage:
    owner = current_user or get_or_create_demo_user(db)
    repo = TradeRepository(db)
    listing = repo.get_listing_or_none(listing_id)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    if current_user is not None and listing.seller_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the seller can upload listing images.")
    if listing.status == "sold":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Sold listings cannot be edited.")
    if len(listing.images) >= 5:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A listing can have at most 5 images.")

    stored_file = await store_listing_image_upload(listing.id, upload_file)
    repo.create_media_asset(
        {
            "owner_user_id": owner.id,
            "entity_type": "listing",
            "entity_id": listing.id,
            "storage_bucket": stored_file.storage_bucket,
            "storage_path": stored_file.storage_path,
            "public_url": stored_file.public_url,
            "mime_type": stored_file.mime_type,
            "file_size": stored_file.file_size,
        }
    )
    return repo.add_listing_image(
        listing.id,
        {
            "storage_path": stored_file.storage_path,
            "public_url": stored_file.public_url,
            "sort_order": sort_order,
            "is_primary": is_primary,
            "content_hash": stored_file.content_hash,
        },
    )


def remove_listing_image(db: Session, listing_id: str, image_id: str, current_user: User) -> None:
    repo = TradeRepository(db)
    listing = repo.get_listing_or_none(listing_id)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    if listing.seller_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the seller can remove listing images.")
    if listing.status == "sold":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Sold listings cannot be edited.")
    image = repo.get_listing_image_or_none(image_id)
    if image is None or image.listing_id != listing.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing image not found")
    repo.remove_listing_image(image)


def create_wanted_post(db: Session, payload: WantedPostCreate, current_user: User | None = None) -> WantedPost:
    owner = current_user or get_or_create_demo_user(db)
    repo = TradeRepository(db)
    wanted_post = repo.create_wanted_post(owner.id, payload.model_dump())
    _refresh_matches_for_category(db, wanted_post.category)
    return wanted_post


def list_wanted_posts(db: Session) -> list[WantedPost]:
    repo = TradeRepository(db)
    return list(repo.list_wanted_posts())


def get_wanted_post(db: Session, wanted_post_id: str) -> WantedPost:
    repo = TradeRepository(db)
    wanted_post = repo.get_wanted_post_or_none(wanted_post_id)
    if wanted_post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wanted post not found")
    return wanted_post


def create_listing_report(
    db: Session,
    listing_id: str,
    payload: ListingReportCreate,
    current_user: User,
) -> ListingReport:
    repo = TradeRepository(db)
    listing = repo.get_listing_or_none(listing_id)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    reason = normalize_listing_report_reason(payload.report_type)
    if reason is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid listing report reason.")
    if repo.get_pending_listing_report_by_user(listing.id, current_user.id) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You already reported this listing.")
    report = repo.create_listing_report(
        {
            "listing_id": listing.id,
            "reporter_user_id": current_user.id,
            "report_type": reason,
            "reason": payload.reason,
            "status": "pending",
        }
    )
    pending_reports = repo.count_pending_listing_reports_from_distinct_users(listing.id)
    if pending_reports >= 3 or reason == "prohibited_item" or listing.risk_level == "high":
        repo.update_listing(
            listing,
            {
                "status": "hidden",
                "moderation_status": "review_required",
                "hidden_at": datetime.now(UTC),
                "hidden_reason": "Auto-hidden after safety reports.",
            },
        )
        repo.expire_pending_contact_requests(listing.id)
    elif listing.moderation_status == "approved":
        repo.update_listing(listing, {"moderation_status": "review_required"})
    repo.create_notification(
        {
            "user_id": listing.seller_id,
            "type": "listing_reported",
            "title": "A listing was reported",
            "body": "Your listing has been sent for UM Nexus safety review.",
            "action_url": f"/trade/{listing.id}",
            "entity_type": "listing",
            "entity_id": listing.id,
        }
    )
    return report


def create_contact_request(
    db: Session,
    listing_id: str,
    payload: ContactRequestCreate,
    current_user: User,
) -> TradeContactRequest:
    repo = TradeRepository(db)
    listing = repo.get_listing_or_none(listing_id)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    if listing.seller_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot request contact for your own listing.")
    if listing.status not in {"available", "reserved"} or listing.moderation_status != "approved":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This listing is not available for contact requests.")
    if not listing.contact_method or not listing.contact_value:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Seller contact setup is incomplete.")
    if repo.get_existing_contact_request(listing.id, current_user.id) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You already have an open contact request for this listing.")

    contact_request = repo.create_contact_request(
        {
            "listing_id": listing.id,
            "buyer_id": current_user.id,
            "seller_id": listing.seller_id,
            "message": payload.message,
            "buyer_contact_method": payload.buyer_contact_method,
            "buyer_contact_value": payload.buyer_contact_value,
            "status": "pending",
        }
    )
    repo.create_notification(
        {
            "user_id": listing.seller_id,
            "type": "contact_request_received",
            "title": "New buyer interest",
            "body": f"Someone is interested in {listing.title}.",
            "action_url": "/trade/dashboard",
            "entity_type": "contact_request",
            "entity_id": contact_request.id,
        }
    )
    return contact_request


def list_contact_requests_for_user(db: Session, current_user: User) -> dict[str, list[TradeContactRequest]]:
    repo = TradeRepository(db)
    return {
        "received": list(repo.list_contact_requests_received(current_user.id)),
        "sent": list(repo.list_contact_requests_sent(current_user.id)),
    }


def decide_contact_request(
    db: Session,
    contact_request_id: str,
    payload: ContactRequestDecision,
    current_user: User,
) -> TradeContactRequest:
    repo = TradeRepository(db)
    contact_request = repo.get_contact_request_or_none(contact_request_id)
    if contact_request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact request not found")
    if contact_request.seller_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the seller can answer this request.")
    if contact_request.status != "pending":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This contact request is already answered.")
    if contact_request.listing and contact_request.listing.status not in {"available", "reserved"}:
        repo.update_contact_request(
            contact_request,
            {"status": "expired", "expired_at": datetime.now(UTC)},
        )
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This item is no longer available.")

    now = datetime.now(UTC)
    values = {
        "status": payload.status,
        "seller_response": payload.seller_response,
        "accepted_at": now if payload.status == "accepted" else None,
        "rejected_at": now if payload.status == "rejected" else None,
    }
    updated = repo.update_contact_request(contact_request, values)
    if updated.status == "accepted":
        if updated.listing and updated.listing.status == "available":
            repo.update_listing(updated.listing, {"status": "reserved"})
        repo.create_trade_transaction(
            {
                "listing_id": updated.listing_id,
                "trade_match_id": None,
                "seller_id": updated.seller_id,
                "buyer_id": updated.buyer_id,
                "status": "contact_accepted",
                "currency": updated.listing.currency if updated.listing else "MYR",
            }
        )
    repo.create_notification(
        {
            "user_id": updated.buyer_id,
            "type": f"contact_request_{updated.status}",
            "title": "Contact request updated",
            "body": f"Your contact request was {updated.status}.",
            "action_url": "/trade/dashboard",
            "entity_type": "contact_request",
            "entity_id": updated.id,
        }
    )
    return updated


def cancel_contact_request(db: Session, contact_request_id: str, current_user: User) -> TradeContactRequest:
    repo = TradeRepository(db)
    contact_request = repo.get_contact_request_or_none(contact_request_id)
    if contact_request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact request not found")
    if contact_request.buyer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the buyer can cancel this request.")
    if contact_request.status != "pending":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Only pending contact requests can be cancelled.")
    updated = repo.update_contact_request(
        contact_request,
        {
            "status": "cancelled",
            "cancelled_at": datetime.now(UTC),
        },
    )
    repo.create_notification(
        {
            "user_id": updated.seller_id,
            "type": "contact_request_cancelled",
            "title": "Buyer cancelled a request",
            "body": "A pending contact request was cancelled by the buyer.",
            "action_url": "/trade/dashboard",
            "entity_type": "contact_request",
            "entity_id": updated.id,
        }
    )
    return updated


def contact_request_read(contact_request: TradeContactRequest, viewer: User) -> ContactRequestRead:
    is_party = viewer.id in {contact_request.buyer_id, contact_request.seller_id}
    reveal = is_party and contact_request.status == "accepted"
    listing = contact_request.listing
    return ContactRequestRead(
        id=contact_request.id,
        listing_id=contact_request.listing_id,
        buyer_id=contact_request.buyer_id,
        seller_id=contact_request.seller_id,
        message=contact_request.message,
        buyer_contact_method=contact_request.buyer_contact_method,
        buyer_contact_value=contact_request.buyer_contact_value if reveal else None,
        seller_contact_method=listing.contact_method if reveal and listing else None,
        seller_contact_value=listing.contact_value if reveal and listing else None,
        status=contact_request.status,
        seller_response=contact_request.seller_response,
        accepted_at=contact_request.accepted_at,
        rejected_at=contact_request.rejected_at,
        cancelled_at=contact_request.cancelled_at,
        expired_at=contact_request.expired_at,
        created_at=contact_request.created_at,
        updated_at=contact_request.updated_at,
        listing=ListingRead.model_validate(listing) if listing else None,
    )


def create_user_report(
    db: Session,
    reported_user_id: str,
    payload: UserReportCreate,
    current_user: User,
) -> UserReport:
    if reported_user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot report your own account.")
    repo = TradeRepository(db)
    if repo.get_user_or_none(reported_user_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if repo.get_pending_user_report_by_user(reported_user_id, current_user.id) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You already reported this user.")
    return repo.create_user_report(
        {
            "reported_user_id": reported_user_id,
            "reporter_user_id": current_user.id,
            "report_type": payload.report_type,
            "reason": payload.reason,
            "status": "pending",
        }
    )


def list_notifications(db: Session, current_user: User):
    return list(TradeRepository(db).list_notifications_for_user(current_user.id))


def mark_notification_read(db: Session, notification_id: str, current_user: User):
    repo = TradeRepository(db)
    notification = repo.get_notification_or_none(notification_id)
    if notification is None or notification.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    return repo.mark_notification_read(notification)


def mark_all_notifications_read(db: Session, current_user: User) -> dict[str, int]:
    count = TradeRepository(db).mark_all_notifications_read(current_user.id)
    return {"updated": count}


def list_moderation_listings(db: Session) -> list[Listing]:
    return list(TradeRepository(db).list_moderation_listings())


def review_listing_reports(
    db: Session,
    listing_id: str,
    payload: ListingReportReview,
    moderator: User,
) -> Listing:
    repo = TradeRepository(db)
    listing = repo.get_listing_or_none(listing_id)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    now = datetime.now(UTC)
    report_status = normalize_report_status(payload.status)
    if report_status is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid report status.")
    for report in repo.list_reports_for_listing(listing.id):
        if report.status == "pending":
            report.status = report_status
            report.moderator_user_id = moderator.id
            report.resolution = payload.resolution
            report.reviewed_at = now
            db.add(report)
    db.commit()

    moderation_status = payload.moderation_status or ("approved" if report_status in {"reviewed", "dismissed"} else "review_required")
    values = {"moderation_status": moderation_status}
    if moderation_status == "rejected":
        values["status"] = "deleted"
    if values.get("status"):
        _apply_listing_status_transition(listing, values["status"], moderator, reason=payload.resolution)
    updated = repo.update_listing(listing, values)
    repo.create_admin_action(
        {
            "admin_id": moderator.id,
            "target_type": "listing",
            "target_id": listing.id,
            "action_type": "mark_report_action_taken" if report_status == "action_taken" else "dismiss_report",
            "reason": payload.resolution,
        }
    )
    return updated


def apply_recommended_price(db: Session, listing_id: str, current_user: User) -> Listing:
    repo = TradeRepository(db)
    listing = repo.get_listing_or_none(listing_id)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    if listing.seller_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the seller can apply this recommendation.")
    if listing.suggested_listing_price is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Run Trade Intelligence before applying a recommended price.")

    suggested = Decimal(str(listing.suggested_listing_price))
    updated = repo.update_listing(
        listing,
        {
            "price": suggested,
            "accepted_recommended_price": suggested,
            "recommendation_applied_at": datetime.now(UTC),
        },
    )
    repo.create_decision_feedback(
        {
            "listing_id": listing.id,
            "user_id": current_user.id,
            "feedback_type": "accepted_price",
            "suggested_listing_price": suggested,
            "applied_price": suggested,
        }
    )
    _refresh_matches_for_listing(db, updated.id)
    return updated


def create_decision_feedback(
    db: Session,
    listing_id: str,
    payload: DecisionFeedbackCreate,
    current_user: User,
) -> TradeDecisionFeedback:
    repo = TradeRepository(db)
    listing = repo.get_listing_or_none(listing_id)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    if listing.seller_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the seller can submit decision feedback.")

    applied_price = Decimal(str(payload.applied_price)) if payload.applied_price is not None else None
    suggested_price = Decimal(str(listing.suggested_listing_price)) if listing.suggested_listing_price is not None else None

    if payload.feedback_type == "changed_price":
        if applied_price is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Changed-price feedback requires applied_price.")
        repo.update_listing(listing, {"price": applied_price})
        _refresh_matches_for_listing(db, listing.id)
    elif payload.feedback_type == "accepted_price" and suggested_price is not None:
        repo.update_listing(
            listing,
            {
                "price": suggested_price,
                "accepted_recommended_price": suggested_price,
                "recommendation_applied_at": datetime.now(UTC),
            },
        )
        applied_price = suggested_price
        _refresh_matches_for_listing(db, listing.id)

    return repo.create_decision_feedback(
        {
            "listing_id": listing.id,
            "user_id": current_user.id,
            "feedback_type": payload.feedback_type,
            "suggested_listing_price": suggested_price,
            "applied_price": applied_price,
            "reason": payload.reason,
        }
    )


def contact_match(db: Session, match_id: str, payload: ContactMatchCreate, current_user: User) -> TradeTransaction:
    repo = TradeRepository(db)
    trade_match = repo.get_trade_match_or_none(match_id)
    if trade_match is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found")
    listing = repo.get_listing_or_none(trade_match.listing_id)
    wanted_post = repo.get_wanted_post_or_none(trade_match.wanted_post_id)
    if listing is None or wanted_post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match target not found")
    if current_user.id not in {listing.seller_id, wanted_post.buyer_id}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only matched buyer or seller can contact this match.")

    trade_match.status = "contacted"
    trade_match.contacted_by_user_id = current_user.id
    trade_match.contacted_at = datetime.now(UTC)
    trade_match.contact_message = payload.message
    db.add(trade_match)
    db.commit()

    return repo.create_trade_transaction(
        {
            "listing_id": listing.id,
            "trade_match_id": trade_match.id,
            "seller_id": listing.seller_id,
            "buyer_id": wanted_post.buyer_id,
            "status": "contacted",
            "currency": listing.currency,
        }
    )


def update_trade_transaction(
    db: Session,
    transaction_id: str,
    payload: TradeTransactionUpdate,
    current_user: User,
) -> TradeTransaction:
    repo = TradeRepository(db)
    transaction = repo.get_trade_transaction_or_none(transaction_id)
    if transaction is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
    if current_user.id not in {transaction.seller_id, transaction.buyer_id}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the buyer or seller can update this transaction.")

    values = payload.model_dump(exclude_unset=True)
    if values.get("status") == "completed":
        agreed_price = values.get("agreed_price", transaction.agreed_price)
        followed_ai = values.get("followed_ai_recommendation", transaction.followed_ai_recommendation)
        if agreed_price is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Completed transactions require agreed_price.")
        if followed_ai is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Completed transactions require followed_ai_recommendation.",
            )
        values["completed_at"] = datetime.now(UTC)
    updated = repo.update_trade_transaction(transaction, values)
    if updated.status == "completed":
        _record_completed_sale(db, updated)
    return updated


def trade_dashboard(db: Session, current_user: User) -> dict:
    repo = TradeRepository(db)
    listings = list(repo.list_listings_by_seller(current_user.id))
    favorites = list(repo.list_favorites_for_user(current_user.id))
    wanted_posts = list(repo.list_wanted_posts_by_buyer(current_user.id))
    matches = list(repo.list_matches_for_user(current_user.id))
    transactions = list(repo.list_transactions_for_user(current_user.id))
    contact_requests_received = list(repo.list_contact_requests_received(current_user.id))
    contact_requests_sent = list(repo.list_contact_requests_sent(current_user.id))
    feedback = list(repo.list_decision_feedback_for_user(current_user.id))
    return {
        "listings": listings,
        "favorites": favorites,
        "wanted_posts": wanted_posts,
        "matches": matches,
        "transactions": transactions,
        "contact_requests_received": contact_requests_received,
        "contact_requests_sent": contact_requests_sent,
        "metrics": _dashboard_metrics(listings, transactions, feedback),
    }


def moderation_summary(db: Session) -> dict:
    listings = list(TradeRepository(db).list_listings(status=None, sort="risk", public_only=False))
    return {
        "high_risk_count": sum(1 for listing in listings if listing.risk_level == "high"),
        "pending_review_count": sum(1 for listing in listings if listing.moderation_status == "review_required"),
        "rejected_count": sum(1 for listing in listings if listing.moderation_status == "rejected"),
        "approved_count": sum(1 for listing in listings if listing.moderation_status == "approved"),
    }


def admin_dashboard(db: Session) -> dict:
    repo = TradeRepository(db)
    _ensure_trade_categories(db)
    listings = list(repo.list_all_listings())
    listing_reports = list(repo.list_listing_reports())
    user_reports = list(repo.list_user_reports())
    settings = get_settings()
    return {
        "statistics": repo.marketplace_statistics(),
        "listings": listings,
        "listing_reports": listing_reports,
        "user_reports": user_reports,
        "suspicious_ai_flags": [
            listing
            for listing in listings
            if listing.moderation_status == "review_required" or listing.risk_level == "high"
        ],
        "users": list(repo.list_users()),
        "categories": list(repo.list_trade_categories()),
        "ai_usage_logs": list(repo.list_ai_usage_logs()),
        "admin_actions": list(repo.list_admin_actions()),
        "ai_settings": {
            "ai_trade_enabled": settings.ai_trade_enabled,
            "ai_student_daily_limit": settings.ai_student_daily_limit,
            "ai_staff_daily_limit": settings.ai_staff_daily_limit,
            "ai_global_daily_limit": settings.ai_global_daily_limit,
        },
    }


def admin_update_listing(
    db: Session,
    listing_id: str,
    payload: AdminListingUpdate,
    moderator: User,
) -> Listing:
    repo = TradeRepository(db)
    listing = repo.get_listing_or_none(listing_id)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    values = payload.model_dump(exclude_unset=True, exclude={"resolution", "reason"})
    if not (payload.reason or payload.resolution):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Admin actions require a reason.")
    if values.get("status") == "deleted" and "moderation_status" not in values:
        values["moderation_status"] = "rejected"
    if values.get("status"):
        _apply_listing_status_transition(listing, values["status"], moderator, reason=payload.reason or payload.resolution)
    updated = repo.update_listing(listing, values)
    if updated.status in {"hidden", "deleted", "sold"}:
        repo.expire_pending_contact_requests(updated.id)
    if payload.resolution:
        now = datetime.now(UTC)
        for report in repo.list_reports_for_listing(listing.id):
            if report.status == "pending":
                report.status = "action_taken" if updated.status in {"hidden", "deleted"} else "reviewed"
                report.moderator_user_id = moderator.id
                report.resolution = payload.resolution
                report.reviewed_at = now
                db.add(report)
        db.commit()
    action_type = "change_category"
    if updated.status == "hidden":
        action_type = "hide_listing"
    elif updated.status == "available":
        action_type = "restore_listing"
    elif updated.status == "deleted":
        action_type = "delete_listing"
    repo.create_admin_action(
        {
            "admin_id": moderator.id,
            "target_type": "listing",
            "target_id": listing.id,
            "action_type": action_type,
            "reason": payload.reason or payload.resolution,
        }
    )
    return updated


def admin_update_user_status(
    db: Session,
    user_id: str,
    payload: AdminUserStatusUpdate,
    admin: User | None = None,
) -> User:
    repo = TradeRepository(db)
    user = repo.get_user_or_none(user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if not payload.reason:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Admin user actions require a reason.")
    updated = repo.update_user(user, {"status": payload.status})
    if payload.status in {"suspended", "banned"}:
        for listing in repo.list_listings_by_seller(user.id):
            if listing.status in {"available", "reserved"}:
                _apply_listing_status_transition(listing, "hidden", admin, reason=payload.reason or f"User {payload.status}.")
                repo.update_listing(
                    listing,
                    {
                        "status": "hidden",
                        "moderation_status": "review_required",
                    },
                )
                repo.expire_pending_contact_requests(listing.id)
    if admin is not None:
        repo.create_admin_action(
            {
                "admin_id": admin.id,
                "target_type": "user",
                "target_id": user.id,
                "action_type": "ban_user" if payload.status == "banned" else "suspend_user" if payload.status == "suspended" else "restore_user",
                "reason": payload.reason,
            }
        )
    return updated


def admin_update_user_role(db: Session, user_id: str, payload: AdminUserRoleUpdate, admin: User) -> User:
    repo = TradeRepository(db)
    user = repo.get_user_or_none(user_id)
    if user is None or user.profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if not payload.reason:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Admin user actions require a reason.")
    user.profile.app_role = AppRole(payload.app_role)
    db.add(user.profile)
    db.commit()
    db.refresh(user.profile)
    repo.create_admin_action(
        {
            "admin_id": admin.id,
            "target_type": "user",
            "target_id": user.id,
            "action_type": "change_user_role",
            "reason": payload.reason,
        }
    )
    return repo.get_user_or_none(user.id) or user


def list_admin_actions(db: Session):
    return list(TradeRepository(db).list_admin_actions())


def list_ai_usage_logs(db: Session):
    return list(TradeRepository(db).list_ai_usage_logs())


def create_product_event(db: Session, payload: ProductEventCreate, current_user: User | None = None):
    return TradeRepository(db).create_product_event(
        {
            "user_id": current_user.id if current_user else None,
            "event_type": payload.event_type,
            "entity_type": payload.entity_type,
            "entity_id": payload.entity_id,
            "event_metadata": payload.metadata,
        }
    )


def list_trade_categories(db: Session):
    _ensure_trade_categories(db)
    return list(TradeRepository(db).list_trade_categories())


def create_trade_category(db: Session, payload: TradeCategoryCreate, admin: User):
    repo = TradeRepository(db)
    slug = normalize_category(payload.slug) if payload.slug in TRADE_CATEGORIES else payload.slug.strip().lower().replace(" ", "_")
    if not slug:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid category slug.")
    if repo.get_trade_category_by_slug(slug) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Category already exists.")
    category = repo.create_trade_category({**payload.model_dump(), "slug": slug})
    repo.create_admin_action(
        {
            "admin_id": admin.id,
            "target_type": "category",
            "target_id": category.id,
            "action_type": "change_category",
            "reason": "Created category.",
        }
    )
    return category


def update_trade_category(db: Session, category_id: str, payload: TradeCategoryUpdate, admin: User):
    repo = TradeRepository(db)
    categories = list(repo.list_trade_categories())
    category = next((item for item in categories if item.id == category_id), None)
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    updated = repo.update_trade_category(category, payload.model_dump(exclude_unset=True))
    repo.create_admin_action(
        {
            "admin_id": admin.id,
            "target_type": "category",
            "target_id": updated.id,
            "action_type": "change_category",
            "reason": "Updated category.",
        }
    )
    return updated


def get_ai_settings() -> dict:
    settings = get_settings()
    return {
        "ai_trade_enabled": settings.ai_trade_enabled,
        "ai_student_daily_limit": settings.ai_student_daily_limit,
        "ai_staff_daily_limit": settings.ai_staff_daily_limit,
        "ai_global_daily_limit": settings.ai_global_daily_limit,
    }


def update_ai_settings(payload: AISettingsUpdate) -> dict:
    settings = get_settings()
    for key, value in payload.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(settings, key, value)
    return get_ai_settings()


def _prepare_listing_values(values: dict, existing: Listing | None = None, *, for_publish: bool = False) -> dict:
    prepared = dict(values)
    if "condition" in prepared and "condition_label" not in prepared:
        prepared["condition_label"] = prepared["condition"]
    prepared.pop("condition", None)
    if "pickup_location" in prepared and "pickup_area" not in prepared:
        prepared["pickup_area"] = prepared["pickup_location"]
    if "pickup_area" in prepared and "pickup_location" not in prepared:
        prepared["pickup_location"] = prepared["pickup_area"]
    if "category" in prepared:
        prepared["category"] = normalize_category(prepared.get("category")) or "others"
    if "condition_label" in prepared:
        prepared["condition_label"] = normalize_condition(prepared.get("condition_label"))
    if "pickup_location" in prepared:
        prepared["pickup_location"] = normalize_pickup_location(prepared.get("pickup_location"))
    if "pickup_area" in prepared:
        prepared["pickup_area"] = normalize_pickup_location(prepared.get("pickup_area"))
    if "status" in prepared and prepared.get("status") is not None:
        prepared["status"] = normalize_listing_status(prepared.get("status")) or prepared.get("status")

    if prepared.get("category", existing.category if existing else None) == "free_items":
        prepared["price"] = 0

    contact_method = prepared.get("contact_method", existing.contact_method if existing else None)
    contact_value = prepared.get("contact_value", existing.contact_value if existing else None)
    if bool(contact_method) != bool(contact_value):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Contact method and contact value must be provided together.",
        )

    if for_publish:
        _validate_publish_ready(prepared, existing)

    scan_values = [
        prepared.get("title", existing.title if existing else None),
        prepared.get("description", existing.description if existing else None),
        prepared.get("category", existing.category if existing else None),
        prepared.get("item_name", existing.item_name if existing else None),
        prepared.get("brand", existing.brand if existing else None),
        prepared.get("model", existing.model if existing else None),
        prepared.get("condition_label", existing.condition_label if existing else None),
        prepared.get("pickup_location", existing.pickup_location if existing else None),
    ]
    policy_scan = scan_listing_policy(*scan_values)
    if policy_scan.blocked:
        detail = "This item appears to violate the UM Nexus prohibited item policy."
        if policy_scan.reason:
            detail = f"{detail} Detected: {policy_scan.reason.replace('_', ' ')}."
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)
    if policy_scan.review_required:
        evidence = dict(existing.risk_evidence or {}) if existing and existing.risk_evidence else {}
        evidence.update(policy_scan.as_evidence())
        prepared["moderation_status"] = "review_required"
        prepared["risk_level"] = prepared.get("risk_level") or (existing.risk_level if existing else None) or "medium"
        current_score = Decimal(str(prepared.get("risk_score") or (existing.risk_score if existing else 0) or 0))
        prepared["risk_score"] = max(current_score, Decimal("55"))
        prepared["risk_evidence"] = evidence
        if for_publish and prepared["risk_level"] == "high":
            prepared["status"] = "hidden"
            prepared["hidden_at"] = datetime.now(UTC)
            prepared["hidden_reason"] = "High-risk policy scan."

    return prepared


def _validate_publish_ready(prepared: dict, existing: Listing | None = None) -> None:
    title = prepared.get("title", existing.title if existing else None)
    description = prepared.get("description", existing.description if existing else None)
    category = prepared.get("category", existing.category if existing else None)
    condition = prepared.get("condition_label", existing.condition_label if existing else None)
    price = prepared.get("price", existing.price if existing else None)
    pickup_location = prepared.get("pickup_location", existing.pickup_location if existing else None)
    contact_method = prepared.get("contact_method", existing.contact_method if existing else None)
    contact_value = prepared.get("contact_value", existing.contact_value if existing else None)
    errors: list[str] = []
    if not title or len(str(title).strip()) < 5:
        errors.append("title")
    if not description or len(str(description).strip()) < 10:
        errors.append("description")
    if not category:
        errors.append("category")
    if not condition:
        errors.append("condition")
    if price is None or Decimal(str(price)) < 0:
        errors.append("price")
    if not pickup_location:
        errors.append("pickup_location")
    if not contact_method or not contact_value:
        errors.append("contact_method")
    if errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Listing is missing required publish fields: {', '.join(errors)}.",
        )


def _ensure_profile_ready(user: User) -> None:
    profile = user.profile
    display_name = getattr(profile, "display_name", None) or getattr(profile, "full_name", None)
    faculty = getattr(profile, "faculty", None)
    location = getattr(profile, "college_or_location", None) or getattr(profile, "residential_college", None)
    if not (display_name and faculty and location):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Complete your profile display name, faculty, and campus location before publishing a listing.",
        )


def _listing_payload_for_validation(listing: Listing) -> dict:
    return {
        "title": listing.title,
        "description": listing.description,
        "category": listing.category,
        "item_name": listing.item_name,
        "brand": listing.brand,
        "model": listing.model,
        "condition_label": listing.condition_label,
        "price": float(listing.price),
        "original_price": float(listing.original_price) if listing.original_price is not None else None,
        "currency": listing.currency,
        "pickup_location": listing.pickup_location or listing.pickup_area,
        "pickup_area": listing.pickup_area or listing.pickup_location,
        "pickup_note": listing.pickup_note,
        "residential_college": listing.residential_college,
        "contact_method": listing.contact_method,
        "contact_value": listing.contact_value,
    }


def _contains_locked_sold_fields(values: dict) -> bool:
    locked = {
        "title",
        "description",
        "category",
        "item_name",
        "brand",
        "model",
        "condition_label",
        "price",
        "original_price",
        "pickup_area",
        "pickup_location",
        "pickup_note",
        "residential_college",
    }
    return bool(locked & set(values))


def _apply_listing_status_transition(
    listing: Listing,
    next_status: str,
    actor: User | None,
    *,
    reason: str | None = None,
) -> None:
    now = datetime.now(UTC)
    if next_status == "hidden":
        listing.hidden_at = now
        listing.hidden_by = actor.id if actor else None
        listing.hidden_reason = reason
    elif next_status == "deleted":
        listing.deleted_at = now
        listing.deleted_by = actor.id if actor else None
        listing.deleted_reason = reason
    elif next_status in {"available", "reserved"}:
        listing.hidden_at = None
        listing.hidden_by = None
        listing.hidden_reason = None


def _can_view_listing(listing: Listing, viewer: User | None) -> bool:
    if listing.status in {"available", "reserved", "sold"} and listing.moderation_status == "approved":
        return True
    if viewer is None:
        return False
    if listing.seller_id == viewer.id:
        return True
    role = getattr(getattr(viewer, "profile", None), "app_role", AppRole.STUDENT)
    return role in {AppRole.MODERATOR, AppRole.ADMIN}


def _viewer_fingerprint(request: Request | None, viewer: User | None) -> str:
    if viewer is not None:
        return f"user:{viewer.id}"
    client_host = request.client.host if request and request.client else "unknown"
    user_agent = request.headers.get("user-agent", "") if request else ""
    raw = f"{client_host}:{user_agent}"
    return sha256(raw.encode("utf-8")).hexdigest()[:64]


def _ensure_trade_categories(db: Session) -> None:
    repo = TradeRepository(db)
    if list(repo.list_trade_categories()):
        return
    labels = {
        "textbooks_notes": "Textbooks & Notes",
        "electronics": "Electronics",
        "dorm_room": "Dorm & Room",
        "kitchen_appliances": "Kitchen Appliances",
        "furniture": "Furniture",
        "clothing": "Clothing",
        "sports_hobby": "Sports & Hobby",
        "tickets_events": "Tickets & Events",
        "free_items": "Free Items",
        "others": "Others",
    }
    for index, slug in enumerate(TRADE_CATEGORIES, start=1):
        repo.create_trade_category(
            {
                "slug": slug,
                "label": labels[slug],
                "sort_order": index * 10,
                "is_active": True,
            }
        )


def _refresh_matches_for_listing(db: Session, listing_id: str) -> None:
    from app.services.trade_intelligence import recompute_matches_for_listing

    try:
        recompute_matches_for_listing(db, listing_id)
    except HTTPException:
        raise
    except Exception:
        # Match refresh should not block create/update flows; enrichment can repair it later.
        db.rollback()


def _refresh_matches_for_category(db: Session, category: str) -> None:
    repo = TradeRepository(db)
    for listing in repo.list_listings_by_category(category):
        _refresh_matches_for_listing(db, listing.id)


def _dashboard_metrics(
    listings: list[Listing],
    transactions: list[TradeTransaction],
    feedback: list[TradeDecisionFeedback],
) -> dict:
    accepted_count = sum(1 for item in feedback if item.feedback_type == "accepted_price")
    adjustments = [
        abs(float(item.applied_price) - float(item.suggested_listing_price))
        for item in feedback
        if item.applied_price is not None and item.suggested_listing_price is not None
    ]
    completed_after_ai = sum(
        1
        for transaction in transactions
        if transaction.status == "completed" and transaction.followed_ai_recommendation is True
    )
    return {
        "recommendations_accepted": accepted_count
        or sum(1 for listing in listings if listing.accepted_recommended_price is not None),
        "decision_feedback_count": len(feedback),
        "completed_sales_after_ai_recommendation": completed_after_ai,
        "average_price_adjustment": round(sum(adjustments) / len(adjustments), 2) if adjustments else None,
    }


def _record_completed_sale(db: Session, transaction: TradeTransaction) -> None:
    repo = TradeRepository(db)
    listing = repo.get_listing_or_none(transaction.listing_id)
    if listing is None or transaction.agreed_price is None:
        return
    existing = (
        db.query(HistoricalSale)
        .filter(
            HistoricalSale.item_name == (listing.item_name or listing.title),
            HistoricalSale.category == listing.category,
            HistoricalSale.sold_price == transaction.agreed_price,
            HistoricalSale.source_type == "transaction",
        )
        .one_or_none()
    )
    if existing is not None:
        return
    db.add(
        HistoricalSale(
            item_name=listing.item_name or listing.title,
            category=listing.category,
            condition_label=listing.condition_label,
            sold_price=transaction.agreed_price,
            currency=transaction.currency,
            location=listing.pickup_location or listing.pickup_area,
            residential_college=listing.residential_college,
            sold_at=transaction.completed_at or datetime.now(UTC),
            notes="Completed UM Nexus trade transaction.",
            source_type="transaction",
        )
    )
    db.commit()
