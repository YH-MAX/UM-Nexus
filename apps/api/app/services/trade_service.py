from datetime import UTC, datetime
from decimal import Decimal

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.models import HistoricalSale, Listing, ListingImage, ListingReport, TradeMatch, TradeTransaction, User, WantedPost
from app.repositories.trade import TradeRepository
from app.schemas.listing import ListingCreate, ListingImageCreate, ListingReportCreate, ListingReportReview, ListingUpdate
from app.schemas.trade_product import ContactMatchCreate, TradeTransactionUpdate
from app.schemas.wanted_post import WantedPostCreate
from app.services.demo_user import get_or_create_demo_user
from app.services.storage_service import store_listing_image_upload


def create_listing(db: Session, payload: ListingCreate, current_user: User | None = None) -> Listing:
    owner = current_user or get_or_create_demo_user(db)
    repo = TradeRepository(db)
    listing = repo.create_listing(owner.id, payload.model_dump())
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
    status: str | None = "active",
    sort: str = "newest",
) -> list[Listing]:
    repo = TradeRepository(db)
    return list(
        repo.list_listings(
            status=status,
            category=category,
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

    values = payload.model_dump(exclude_unset=True)
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
        values["completed_at"] = datetime.now(UTC)
    updated = repo.update_trade_transaction(transaction, values)
    if updated.status == "completed":
        _record_completed_sale(db, updated)
    return updated


def trade_dashboard(db: Session, current_user: User) -> dict:
    repo = TradeRepository(db)
    return {
        "listings": list(repo.list_listings_by_seller(current_user.id)),
        "wanted_posts": list(repo.list_wanted_posts_by_buyer(current_user.id)),
        "matches": list(repo.list_matches_for_user(current_user.id)),
        "transactions": list(repo.list_transactions_for_user(current_user.id)),
    }


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
