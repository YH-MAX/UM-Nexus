from datetime import UTC, datetime
from decimal import Decimal

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.models import (
    HistoricalSale,
    Listing,
    ListingImage,
    ListingReport,
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
    ListingCreate,
    ListingImageCreate,
    ListingRead,
    ListingReportCreate,
    ListingReportReview,
    ListingUpdate,
)
from app.schemas.trade_product import (
    AdminListingUpdate,
    AdminUserStatusUpdate,
    ContactMatchCreate,
    ContactRequestCreate,
    ContactRequestDecision,
    ContactRequestRead,
    DecisionFeedbackCreate,
    TradeTransactionUpdate,
    UserReportCreate,
)
from app.schemas.wanted_post import WantedPostCreate
from app.services.demo_user import get_or_create_demo_user
from app.services.storage_service import store_listing_image_upload
from app.services.trade_policy import (
    normalize_category,
    normalize_condition,
    normalize_listing_status,
    scan_listing_policy,
)


def create_listing(db: Session, payload: ListingCreate, current_user: User | None = None) -> Listing:
    owner = current_user or get_or_create_demo_user(db)
    repo = TradeRepository(db)
    values = _prepare_listing_values(payload.model_dump())
    listing = repo.create_listing(owner.id, values)
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
    risk_level: str | None = None,
    condition: str | None = None,
    status: str | None = "available",
    sort: str = "newest",
) -> list[Listing]:
    repo = TradeRepository(db)
    normalized_status = normalize_listing_status(status) if status else None
    normalized_condition = normalize_condition(condition) if condition else None
    return list(
        repo.list_listings(
            status=normalized_status,
            category=normalize_category(category) if category else None,
            condition=normalized_condition,
            search=search,
            min_price=min_price,
            max_price=max_price,
            pickup_area=pickup_area,
            risk_level=risk_level,
            sort=sort,
        )
    )


def get_listing(db: Session, listing_id: str) -> Listing:
    repo = TradeRepository(db)
    listing = repo.get_listing_or_none(listing_id)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
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

    values = _prepare_listing_values(payload.model_dump(exclude_unset=True), existing=listing)
    updated = repo.update_listing(listing, values)
    if {"title", "description", "category", "item_name", "brand", "model", "condition_label", "price", "pickup_area", "residential_college"} & set(values):
        _refresh_matches_for_listing(db, updated.id)
    return updated


def add_listing_image(db: Session, listing_id: str, payload: ListingImageCreate, current_user: User | None = None) -> ListingImage:
    if current_user is None:
        get_or_create_demo_user(db)
    repo = TradeRepository(db)
    listing = repo.get_listing_or_none(listing_id)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    if current_user is not None and listing.seller_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the seller can add listing images.")

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
    report = repo.create_listing_report(
        {
            "listing_id": listing.id,
            "reporter_user_id": current_user.id,
            "report_type": payload.report_type,
            "reason": payload.reason,
            "status": "open",
        }
    )
    if listing.moderation_status == "approved":
        repo.update_listing(listing, {"moderation_status": "review_required"})
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
    if listing.status != "available" or listing.moderation_status != "approved":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This listing is not available for contact requests.")
    if not listing.contact_method or not listing.contact_value:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Seller contact setup is incomplete.")
    if repo.get_existing_contact_request(listing.id, current_user.id) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You already have an open contact request for this listing.")

    return repo.create_contact_request(
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

    now = datetime.now(UTC)
    values = {
        "status": payload.status,
        "seller_response": payload.seller_response,
        "accepted_at": now if payload.status == "accepted" else None,
        "rejected_at": now if payload.status == "rejected" else None,
    }
    updated = repo.update_contact_request(contact_request, values)
    if updated.status == "accepted":
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
    return repo.create_user_report(
        {
            "reported_user_id": reported_user_id,
            "reporter_user_id": current_user.id,
            "report_type": payload.report_type,
            "reason": payload.reason,
            "status": "open",
        }
    )


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
    for report in repo.list_reports_for_listing(listing.id):
        if report.status == "open":
            report.status = payload.status
            report.moderator_user_id = moderator.id
            report.resolution = payload.resolution
            report.reviewed_at = now
            db.add(report)
    db.commit()

    moderation_status = payload.moderation_status or ("approved" if payload.status in {"resolved", "dismissed"} else "review_required")
    values = {"moderation_status": moderation_status}
    if moderation_status == "rejected":
        values["status"] = "removed"
    return repo.update_listing(listing, values)


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
    wanted_posts = list(repo.list_wanted_posts_by_buyer(current_user.id))
    matches = list(repo.list_matches_for_user(current_user.id))
    transactions = list(repo.list_transactions_for_user(current_user.id))
    contact_requests_received = list(repo.list_contact_requests_received(current_user.id))
    contact_requests_sent = list(repo.list_contact_requests_sent(current_user.id))
    feedback = list(repo.list_decision_feedback_for_user(current_user.id))
    return {
        "listings": listings,
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
    listings = list(repo.list_all_listings())
    listing_reports = list(repo.list_listing_reports())
    user_reports = list(repo.list_user_reports())
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
    values = payload.model_dump(exclude_unset=True, exclude={"resolution"})
    if values.get("status") == "removed" and "moderation_status" not in values:
        values["moderation_status"] = "rejected"
    updated = repo.update_listing(listing, values)
    if payload.resolution:
        now = datetime.now(UTC)
        for report in repo.list_reports_for_listing(listing.id):
            if report.status == "open":
                report.status = "resolved"
                report.moderator_user_id = moderator.id
                report.resolution = payload.resolution
                report.reviewed_at = now
                db.add(report)
        db.commit()
    return updated


def admin_update_user_status(
    db: Session,
    user_id: str,
    payload: AdminUserStatusUpdate,
) -> User:
    repo = TradeRepository(db)
    user = repo.get_user_or_none(user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return repo.update_user(user, {"status": payload.status})


def _prepare_listing_values(values: dict, existing: Listing | None = None) -> dict:
    prepared = dict(values)
    if "category" in prepared:
        prepared["category"] = normalize_category(prepared.get("category")) or "others"
    if "condition_label" in prepared:
        prepared["condition_label"] = normalize_condition(prepared.get("condition_label"))
    if "status" in prepared and prepared.get("status") is not None:
        prepared["status"] = normalize_listing_status(prepared.get("status")) or prepared.get("status")

    contact_method = prepared.get("contact_method", existing.contact_method if existing else None)
    contact_value = prepared.get("contact_value", existing.contact_value if existing else None)
    if bool(contact_method) != bool(contact_value):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Contact method and contact value must be provided together.",
        )

    scan_values = [
        prepared.get("title", existing.title if existing else None),
        prepared.get("description", existing.description if existing else None),
        prepared.get("category", existing.category if existing else None),
        prepared.get("item_name", existing.item_name if existing else None),
        prepared.get("brand", existing.brand if existing else None),
        prepared.get("model", existing.model if existing else None),
        prepared.get("condition_label", existing.condition_label if existing else None),
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

    return prepared


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
            location=listing.pickup_area,
            residential_college=listing.residential_college,
            sold_at=transaction.completed_at or datetime.now(UTC),
            notes="Completed UM Nexus trade transaction.",
            source_type="transaction",
        )
    )
    db.commit()
