from __future__ import annotations

from collections.abc import Sequence
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import asc, desc, false, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.models import (
    AdminAction,
    AgentOutput,
    AgentRun,
    AISuggestion,
    AIUsageLog,
    HistoricalSale,
    Listing,
    ListingEmbedding,
    ListingFavorite,
    ListingImage,
    ListingReport,
    ListingView,
    MediaAsset,
    Notification,
    ProductEvent,
    TradeCategory,
    TradeDecisionFeedback,
    TradeContactRequest,
    TradeMatch,
    TradeTransaction,
    User,
    UserReport,
    WantedPost,
    WantedPostEmbedding,
)
from app.trade.constants import PUBLIC_LISTING_STATUSES


PUBLIC_MODERATION_STATUSES = ("clear", "flagged", "approved")


class TradeRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create_listing(self, seller_id: str, values: dict) -> Listing:
        listing = Listing(seller_id=seller_id, **values)
        self.db.add(listing)
        self.db.commit()
        return self.get_listing_or_none(listing.id) or listing

    def count_listings_created_by_user_since(self, seller_id: str, since: datetime) -> int:
        stmt = (
            select(func.count())
            .select_from(Listing)
            .where(Listing.seller_id == seller_id, Listing.created_at >= since)
        )
        return int(self.db.scalar(stmt) or 0)

    def list_listings(
        self,
        *,
        status: str | None = "available",
        category: str | None = None,
        condition: str | None = None,
        search: str | None = None,
        min_price: float | None = None,
        max_price: float | None = None,
        pickup_area: str | None = None,
        pickup_location: str | None = None,
        risk_level: str | None = None,
        sort: str = "newest",
        public_only: bool = True,
    ) -> Sequence[Listing]:
        stmt = (
            select(Listing)
            .options(selectinload(Listing.images), selectinload(Listing.seller).selectinload(User.profile))
        )
        if public_only:
            stmt = stmt.where(Listing.moderation_status.in_(PUBLIC_MODERATION_STATUSES))
            if status is not None and status not in PUBLIC_LISTING_STATUSES:
                stmt = stmt.where(false())
            elif status is None:
                stmt = stmt.where(Listing.status.in_(PUBLIC_LISTING_STATUSES))
        if status:
            stmt = stmt.where(Listing.status == status)
        if category:
            stmt = stmt.where(Listing.category == category)
        if condition:
            stmt = stmt.where(Listing.condition_label == condition)
        location = pickup_location or pickup_area
        if location:
            stmt = stmt.where(or_(Listing.pickup_location == location, Listing.pickup_area == location))
        if risk_level:
            stmt = stmt.where(Listing.risk_level == risk_level)
        if min_price is not None:
            stmt = stmt.where(Listing.price >= min_price)
        if max_price is not None:
            stmt = stmt.where(Listing.price <= max_price)
        if search:
            pattern = f"%{search.lower()}%"
            stmt = stmt.where(
                or_(
                    func.lower(Listing.title).like(pattern),
                    func.lower(Listing.item_name).like(pattern),
                    func.lower(Listing.brand).like(pattern),
                    func.lower(Listing.description).like(pattern),
                )
            )
        if sort in {"price_asc", "price_low_high"}:
            stmt = stmt.order_by(asc(Listing.price), desc(Listing.created_at))
        elif sort in {"price_desc", "price_high_low"}:
            stmt = stmt.order_by(desc(Listing.price), desc(Listing.created_at))
        elif sort == "risk":
            stmt = stmt.order_by(desc(Listing.risk_score), desc(Listing.created_at))
        elif sort == "oldest":
            stmt = stmt.order_by(asc(Listing.created_at))
        else:
            stmt = stmt.order_by(desc(Listing.created_at))
        return self.db.scalars(stmt).all()

    def list_listings_by_seller(self, seller_id: str) -> Sequence[Listing]:
        stmt = (
            select(Listing)
            .options(selectinload(Listing.images), selectinload(Listing.seller).selectinload(User.profile))
            .where(Listing.seller_id == seller_id)
            .order_by(desc(Listing.created_at))
        )
        return self.db.scalars(stmt).all()

    def list_listings_by_category(self, category: str, status: str = "available") -> Sequence[Listing]:
        stmt = (
            select(Listing)
            .options(selectinload(Listing.images))
            .where(Listing.category == category, Listing.status == status, Listing.moderation_status.in_(PUBLIC_MODERATION_STATUSES))
            .order_by(desc(Listing.created_at))
        )
        return self.db.scalars(stmt).all()

    def get_listing_or_none(self, listing_id: str) -> Listing | None:
        stmt = (
            select(Listing)
            .options(
                selectinload(Listing.images),
                selectinload(Listing.reports),
                selectinload(Listing.seller).selectinload(User.profile),
            )
            .where(Listing.id == listing_id)
        )
        return self.db.scalar(stmt)

    def list_all_listings(self) -> Sequence[Listing]:
        stmt = (
            select(Listing)
            .options(selectinload(Listing.images), selectinload(Listing.seller).selectinload(User.profile))
            .order_by(desc(Listing.updated_at), desc(Listing.created_at))
        )
        return self.db.scalars(stmt).all()

    def update_listing(self, listing: Listing, values: dict) -> Listing:
        for field_name, value in values.items():
            setattr(listing, field_name, value)

        self.db.add(listing)
        self.db.commit()
        return self.get_listing_or_none(listing.id) or listing

    def add_listing_image(self, listing_id: str, values: dict) -> ListingImage:
        image = ListingImage(listing_id=listing_id, **values)
        self.db.add(image)
        self.db.commit()
        self.db.refresh(image)
        return image

    def remove_listing_image(self, image: ListingImage) -> None:
        self.db.delete(image)
        self.db.commit()

    def get_listing_image_or_none(self, image_id: str) -> ListingImage | None:
        return self.db.get(ListingImage, image_id)

    def create_favorite(self, user_id: str, listing_id: str) -> ListingFavorite:
        favorite = ListingFavorite(user_id=user_id, listing_id=listing_id)
        self.db.add(favorite)
        try:
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            existing = self.get_favorite_or_none(user_id, listing_id)
            if existing is not None:
                return existing
            raise
        return self.get_favorite_or_none(user_id, listing_id) or favorite

    def get_favorite_or_none(self, user_id: str, listing_id: str) -> ListingFavorite | None:
        stmt = (
            select(ListingFavorite)
            .options(selectinload(ListingFavorite.listing).selectinload(Listing.images))
            .where(ListingFavorite.user_id == user_id, ListingFavorite.listing_id == listing_id)
        )
        return self.db.scalar(stmt)

    def delete_favorite(self, favorite: ListingFavorite) -> None:
        self.db.delete(favorite)
        self.db.commit()

    def list_favorites_for_user(self, user_id: str) -> Sequence[ListingFavorite]:
        stmt = (
            select(ListingFavorite)
            .options(
                selectinload(ListingFavorite.listing).selectinload(Listing.images),
                selectinload(ListingFavorite.listing)
                .selectinload(Listing.seller)
                .selectinload(User.profile),
            )
            .where(ListingFavorite.user_id == user_id)
            .order_by(desc(ListingFavorite.created_at))
        )
        return self.db.scalars(stmt).all()

    def record_listing_view(
        self,
        *,
        listing: Listing,
        viewer_fingerprint: str,
        viewer_user_id: str | None = None,
        viewed_on: date | None = None,
    ) -> bool:
        view = ListingView(
            listing_id=listing.id,
            viewer_user_id=viewer_user_id,
            viewer_fingerprint=viewer_fingerprint,
            viewed_on=viewed_on or datetime.now(UTC).date(),
        )
        self.db.add(view)
        try:
            listing.view_count = int(listing.view_count or 0) + 1
            self.db.add(listing)
            self.db.commit()
            return True
        except IntegrityError:
            self.db.rollback()
            return False

    def create_media_asset(self, values: dict) -> MediaAsset:
        media_asset = MediaAsset(**values)
        self.db.add(media_asset)
        self.db.commit()
        self.db.refresh(media_asset)
        return media_asset

    def create_wanted_post(self, buyer_id: str, values: dict) -> WantedPost:
        wanted_post = WantedPost(buyer_id=buyer_id, **values)
        self.db.add(wanted_post)
        self.db.commit()
        self.db.refresh(wanted_post)
        return wanted_post

    def count_wanted_posts_created_by_user_since(self, buyer_id: str, since: datetime) -> int:
        stmt = (
            select(func.count())
            .select_from(WantedPost)
            .where(WantedPost.buyer_id == buyer_id, WantedPost.created_at >= since)
        )
        return int(self.db.scalar(stmt) or 0)

    def list_wanted_posts(self, status: str = "active") -> Sequence[WantedPost]:
        stmt = select(WantedPost).where(WantedPost.status == status).order_by(desc(WantedPost.created_at))
        return self.db.scalars(stmt).all()

    def list_wanted_posts_by_buyer(self, buyer_id: str) -> Sequence[WantedPost]:
        stmt = select(WantedPost).where(WantedPost.buyer_id == buyer_id).order_by(desc(WantedPost.created_at))
        return self.db.scalars(stmt).all()

    def list_wanted_posts_by_category(self, category: str, status: str = "active") -> Sequence[WantedPost]:
        stmt = (
            select(WantedPost)
            .where(WantedPost.category == category, WantedPost.status == status)
            .order_by(desc(WantedPost.created_at))
        )
        return self.db.scalars(stmt).all()

    def list_active_wanted_posts(self) -> Sequence[WantedPost]:
        stmt = select(WantedPost).where(WantedPost.status == "active").order_by(desc(WantedPost.created_at))
        return self.db.scalars(stmt).all()

    def get_wanted_post_or_none(self, wanted_post_id: str) -> WantedPost | None:
        stmt = select(WantedPost).where(WantedPost.id == wanted_post_id)
        return self.db.scalar(stmt)

    def upsert_trade_match(
        self,
        listing_id: str,
        wanted_post_id: str,
        values: dict,
    ) -> TradeMatch:
        stmt = select(TradeMatch).where(
            TradeMatch.listing_id == listing_id,
            TradeMatch.wanted_post_id == wanted_post_id,
        )
        trade_match = self.db.scalar(stmt)

        if trade_match is None:
            trade_match = TradeMatch(
                listing_id=listing_id,
                wanted_post_id=wanted_post_id,
                **values,
            )
        else:
            for field_name, value in values.items():
                setattr(trade_match, field_name, value)

        self.db.add(trade_match)
        self.db.commit()
        return self.get_trade_match_or_none(trade_match.id) or trade_match

    def list_matches_for_listing(
        self,
        listing_id: str,
        *,
        min_score: float | None = None,
        limit: int | None = None,
    ) -> Sequence[TradeMatch]:
        stmt = (
            select(TradeMatch)
            .join(WantedPost, TradeMatch.wanted_post_id == WantedPost.id)
            .options(selectinload(TradeMatch.wanted_post))
            .where(TradeMatch.listing_id == listing_id, WantedPost.status == "active")
            .order_by(desc(TradeMatch.match_score), desc(TradeMatch.created_at))
        )
        if min_score is not None:
            stmt = stmt.where(TradeMatch.match_score >= min_score)
        if limit is not None:
            stmt = stmt.limit(limit)
        return self.db.scalars(stmt).all()

    def list_matches_for_wanted_post(self, wanted_post_id: str) -> Sequence[TradeMatch]:
        stmt = (
            select(TradeMatch)
            .options(selectinload(TradeMatch.wanted_post), selectinload(TradeMatch.listing).selectinload(Listing.images))
            .where(TradeMatch.wanted_post_id == wanted_post_id)
            .order_by(desc(TradeMatch.match_score), desc(TradeMatch.created_at))
        )
        return self.db.scalars(stmt).all()

    def get_trade_match_or_none(self, trade_match_id: str) -> TradeMatch | None:
        stmt = (
            select(TradeMatch)
            .options(selectinload(TradeMatch.wanted_post))
            .where(TradeMatch.id == trade_match_id)
        )
        return self.db.scalar(stmt)

    def list_matches_for_user(self, user_id: str) -> Sequence[TradeMatch]:
        stmt = (
            select(TradeMatch)
            .join(Listing, TradeMatch.listing_id == Listing.id)
            .join(WantedPost, TradeMatch.wanted_post_id == WantedPost.id)
            .options(selectinload(TradeMatch.wanted_post), selectinload(TradeMatch.listing))
            .where(or_(Listing.seller_id == user_id, WantedPost.buyer_id == user_id))
            .order_by(desc(TradeMatch.updated_at), desc(TradeMatch.match_score))
        )
        return self.db.scalars(stmt).all()

    def create_agent_run(self, values: dict) -> AgentRun:
        agent_run = AgentRun(**values)
        self.db.add(agent_run)
        self.db.commit()
        self.db.refresh(agent_run)
        return agent_run

    def get_agent_run_or_none(self, agent_run_id: str) -> AgentRun | None:
        stmt = select(AgentRun).where(AgentRun.id == agent_run_id)
        return self.db.scalar(stmt)

    def update_agent_run(self, agent_run: AgentRun, values: dict) -> AgentRun:
        for field_name, value in values.items():
            setattr(agent_run, field_name, value)
        self.db.add(agent_run)
        self.db.commit()
        self.db.refresh(agent_run)
        return agent_run

    def create_agent_output(self, agent_run_id: str, output_type: str, content: dict) -> AgentOutput:
        output = AgentOutput(
            agent_run_id=agent_run_id,
            output_type=output_type,
            content=content,
        )
        self.db.add(output)
        self.db.commit()
        self.db.refresh(output)
        return output

    def get_latest_trade_result_for_listing(self, listing_id: str) -> AgentOutput | None:
        stmt = (
            select(AgentOutput)
            .join(AgentRun, AgentOutput.agent_run_id == AgentRun.id)
            .where(
                AgentRun.entity_type == "listing",
                AgentRun.entity_id == listing_id,
                AgentRun.status == "completed",
                AgentOutput.output_type == "trade_intelligence_result",
            )
            .order_by(desc(AgentOutput.created_at))
        )
        return self.db.scalar(stmt)

    def get_latest_agent_run_for_listing(self, listing_id: str) -> AgentRun | None:
        stmt = (
            select(AgentRun)
            .where(
                AgentRun.entity_type == "listing",
                AgentRun.entity_id == listing_id,
                AgentRun.agent_name == "trade_intelligence_orchestrator",
            )
            .order_by(desc(AgentRun.created_at))
        )
        return self.db.scalar(stmt)

    def list_historical_sales_for_category(self, category: str) -> Sequence[HistoricalSale]:
        stmt = (
            select(HistoricalSale)
            .where(HistoricalSale.category == category)
            .order_by(desc(HistoricalSale.sold_at), desc(HistoricalSale.created_at))
        )
        return self.db.scalars(stmt).all()

    def create_historical_sale(self, values: dict) -> HistoricalSale:
        sale = HistoricalSale(**values)
        self.db.add(sale)
        self.db.commit()
        self.db.refresh(sale)
        return sale

    def count_listing_reports(self, listing_id: str) -> int:
        stmt = select(func.count()).select_from(ListingReport).where(ListingReport.listing_id == listing_id)
        return int(self.db.scalar(stmt) or 0)

    def count_pending_listing_reports_from_distinct_users(self, listing_id: str) -> int:
        stmt = (
            select(func.count(func.distinct(ListingReport.reporter_user_id)))
            .select_from(ListingReport)
            .where(ListingReport.listing_id == listing_id, ListingReport.status == "pending")
        )
        return int(self.db.scalar(stmt) or 0)

    def count_duplicate_image_hashes(self, listing_id: str) -> int:
        hashes_stmt = select(ListingImage.content_hash).where(
            ListingImage.listing_id == listing_id,
            ListingImage.content_hash.is_not(None),
        )
        hashes = [value for value in self.db.scalars(hashes_stmt).all() if value]
        if not hashes:
            return 0
        stmt = (
            select(func.count())
            .select_from(ListingImage)
            .where(ListingImage.listing_id != listing_id, ListingImage.content_hash.in_(hashes))
        )
        return int(self.db.scalar(stmt) or 0)

    def create_listing_report(self, values: dict) -> ListingReport:
        report = ListingReport(**values)
        self.db.add(report)
        self.db.commit()
        self.db.refresh(report)
        return report

    def count_listing_reports_by_user_since(self, reporter_user_id: str, since: datetime) -> int:
        stmt = (
            select(func.count())
            .select_from(ListingReport)
            .where(ListingReport.reporter_user_id == reporter_user_id, ListingReport.created_at >= since)
        )
        return int(self.db.scalar(stmt) or 0)

    def get_pending_listing_report_by_user(self, listing_id: str, reporter_user_id: str) -> ListingReport | None:
        stmt = select(ListingReport).where(
            ListingReport.listing_id == listing_id,
            ListingReport.reporter_user_id == reporter_user_id,
            ListingReport.status == "pending",
        )
        return self.db.scalar(stmt)

    def list_listing_reports(self) -> Sequence[ListingReport]:
        stmt = select(ListingReport).order_by(desc(ListingReport.created_at))
        return self.db.scalars(stmt).all()

    def list_reports_for_listing(self, listing_id: str) -> Sequence[ListingReport]:
        stmt = (
            select(ListingReport)
            .where(ListingReport.listing_id == listing_id)
            .order_by(desc(ListingReport.created_at))
        )
        return self.db.scalars(stmt).all()

    def create_contact_request(self, values: dict) -> TradeContactRequest:
        contact_request = TradeContactRequest(**values)
        self.db.add(contact_request)
        self.db.commit()
        return self.get_contact_request_or_none(contact_request.id) or contact_request

    def count_contact_requests_by_user_since(self, buyer_id: str, since: datetime) -> int:
        stmt = (
            select(func.count())
            .select_from(TradeContactRequest)
            .where(TradeContactRequest.buyer_id == buyer_id, TradeContactRequest.created_at >= since)
        )
        return int(self.db.scalar(stmt) or 0)

    def get_contact_request_or_none(self, contact_request_id: str) -> TradeContactRequest | None:
        stmt = (
            select(TradeContactRequest)
            .options(
                selectinload(TradeContactRequest.listing).selectinload(Listing.images),
                selectinload(TradeContactRequest.listing)
                .selectinload(Listing.seller)
                .selectinload(User.profile),
            )
            .where(TradeContactRequest.id == contact_request_id)
        )
        return self.db.scalar(stmt)

    def get_existing_contact_request(self, listing_id: str, buyer_id: str) -> TradeContactRequest | None:
        stmt = select(TradeContactRequest).where(
            TradeContactRequest.listing_id == listing_id,
            TradeContactRequest.buyer_id == buyer_id,
            TradeContactRequest.status.in_(("pending", "accepted")),
        )
        return self.db.scalar(stmt)

    def expire_pending_contact_requests(self, listing_id: str, *, expired_at: datetime | None = None) -> int:
        now = expired_at or datetime.now(UTC)
        requests = list(
            self.db.scalars(
                select(TradeContactRequest).where(
                    TradeContactRequest.listing_id == listing_id,
                    TradeContactRequest.status == "pending",
                )
            ).all()
        )
        for contact_request in requests:
            contact_request.status = "expired"
            contact_request.expired_at = now
            self.db.add(contact_request)
        if requests:
            self.db.commit()
        return len(requests)

    def expire_stale_pending_contact_requests(
        self,
        cutoff: datetime,
        *,
        expired_at: datetime | None = None,
    ) -> Sequence[TradeContactRequest]:
        now = expired_at or datetime.now(UTC)
        requests = list(
            self.db.scalars(
                select(TradeContactRequest)
                .options(selectinload(TradeContactRequest.listing))
                .where(
                    TradeContactRequest.status == "pending",
                    TradeContactRequest.created_at <= cutoff,
                )
            ).all()
        )
        for contact_request in requests:
            contact_request.status = "expired"
            contact_request.expired_at = now
            self.db.add(contact_request)
        if requests:
            self.db.commit()
            ids = [contact_request.id for contact_request in requests]
            return self.db.scalars(
                select(TradeContactRequest)
                .options(selectinload(TradeContactRequest.listing).selectinload(Listing.images))
                .where(TradeContactRequest.id.in_(ids))
            ).all()
        return requests

    def list_contact_requests_received(self, seller_id: str) -> Sequence[TradeContactRequest]:
        stmt = (
            select(TradeContactRequest)
            .options(
                selectinload(TradeContactRequest.listing).selectinload(Listing.images),
                selectinload(TradeContactRequest.listing)
                .selectinload(Listing.seller)
                .selectinload(User.profile),
            )
            .where(TradeContactRequest.seller_id == seller_id)
            .order_by(desc(TradeContactRequest.updated_at), desc(TradeContactRequest.created_at))
        )
        return self.db.scalars(stmt).all()

    def list_contact_requests_sent(self, buyer_id: str) -> Sequence[TradeContactRequest]:
        stmt = (
            select(TradeContactRequest)
            .options(
                selectinload(TradeContactRequest.listing).selectinload(Listing.images),
                selectinload(TradeContactRequest.listing)
                .selectinload(Listing.seller)
                .selectinload(User.profile),
            )
            .where(TradeContactRequest.buyer_id == buyer_id)
            .order_by(desc(TradeContactRequest.updated_at), desc(TradeContactRequest.created_at))
        )
        return self.db.scalars(stmt).all()

    def list_contact_requests_sent_for_listing(self, listing_id: str) -> Sequence[TradeContactRequest]:
        stmt = (
            select(TradeContactRequest)
            .where(TradeContactRequest.listing_id == listing_id)
            .order_by(desc(TradeContactRequest.updated_at), desc(TradeContactRequest.created_at))
        )
        return self.db.scalars(stmt).all()

    def update_contact_request(self, contact_request: TradeContactRequest, values: dict) -> TradeContactRequest:
        for field_name, value in values.items():
            setattr(contact_request, field_name, value)
        self.db.add(contact_request)
        self.db.commit()
        return self.get_contact_request_or_none(contact_request.id) or contact_request

    def create_user_report(self, values: dict) -> UserReport:
        report = UserReport(**values)
        self.db.add(report)
        self.db.commit()
        self.db.refresh(report)
        return report

    def count_user_reports_by_user_since(self, reporter_user_id: str, since: datetime) -> int:
        stmt = (
            select(func.count())
            .select_from(UserReport)
            .where(UserReport.reporter_user_id == reporter_user_id, UserReport.created_at >= since)
        )
        return int(self.db.scalar(stmt) or 0)

    def get_pending_user_report_by_user(self, reported_user_id: str, reporter_user_id: str) -> UserReport | None:
        stmt = select(UserReport).where(
            UserReport.reported_user_id == reported_user_id,
            UserReport.reporter_user_id == reporter_user_id,
            UserReport.status == "pending",
        )
        return self.db.scalar(stmt)

    def list_user_reports(self) -> Sequence[UserReport]:
        stmt = select(UserReport).order_by(desc(UserReport.created_at))
        return self.db.scalars(stmt).all()

    def list_users(self) -> Sequence[User]:
        stmt = (
            select(User)
            .options(selectinload(User.profile))
            .order_by(desc(User.created_at))
        )
        return self.db.scalars(stmt).all()

    def get_user_or_none(self, user_id: str) -> User | None:
        stmt = select(User).options(selectinload(User.profile)).where(User.id == user_id)
        return self.db.scalar(stmt)

    def update_user(self, user: User, values: dict) -> User:
        for field_name, value in values.items():
            setattr(user, field_name, value)
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def create_notification(self, values: dict) -> Notification:
        notification = Notification(**values)
        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)
        return notification

    def list_notifications_for_user(self, user_id: str, limit: int = 50) -> Sequence[Notification]:
        stmt = (
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(desc(Notification.created_at))
            .limit(limit)
        )
        return self.db.scalars(stmt).all()

    def count_unread_notifications_for_user(self, user_id: str) -> int:
        stmt = (
            select(func.count())
            .select_from(Notification)
            .where(Notification.user_id == user_id, Notification.is_read.is_(False))
        )
        return int(self.db.scalar(stmt) or 0)

    def get_notification_or_none(self, notification_id: str) -> Notification | None:
        return self.db.get(Notification, notification_id)

    def mark_notification_read(self, notification: Notification, *, read_at: datetime | None = None) -> Notification:
        notification.is_read = True
        notification.read_at = read_at or datetime.now(UTC)
        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)
        return notification

    def mark_all_notifications_read(self, user_id: str, *, read_at: datetime | None = None) -> int:
        now = read_at or datetime.now(UTC)
        notifications = list(
            self.db.scalars(
                select(Notification).where(Notification.user_id == user_id, Notification.is_read.is_(False))
            ).all()
        )
        for notification in notifications:
            notification.is_read = True
            notification.read_at = now
            self.db.add(notification)
        if notifications:
            self.db.commit()
        return len(notifications)

    def create_admin_action(self, values: dict) -> AdminAction:
        action = AdminAction(**values)
        self.db.add(action)
        self.db.commit()
        self.db.refresh(action)
        return action

    def list_admin_actions(self, limit: int = 100) -> Sequence[AdminAction]:
        stmt = select(AdminAction).order_by(desc(AdminAction.created_at)).limit(limit)
        return self.db.scalars(stmt).all()

    def create_ai_usage_log(self, values: dict) -> AIUsageLog:
        log = AIUsageLog(**values)
        self.db.add(log)
        self.db.commit()
        self.db.refresh(log)
        return log

    def list_ai_usage_logs(self, limit: int = 100) -> Sequence[AIUsageLog]:
        stmt = select(AIUsageLog).order_by(desc(AIUsageLog.created_at)).limit(limit)
        return self.db.scalars(stmt).all()

    def create_product_event(self, values: dict) -> ProductEvent:
        event = ProductEvent(**values)
        self.db.add(event)
        self.db.commit()
        self.db.refresh(event)
        return event

    def count_ai_usage_logs(
        self,
        *,
        feature: str | None = None,
        user_id: str | None = None,
        statuses: tuple[str, ...] | None = None,
        since: datetime | None = None,
    ) -> int:
        stmt = select(func.count()).select_from(AIUsageLog)
        if feature:
            stmt = stmt.where(AIUsageLog.feature == feature)
        if user_id:
            stmt = stmt.where(AIUsageLog.user_id == user_id)
        if statuses:
            stmt = stmt.where(AIUsageLog.request_status.in_(statuses))
        if since:
            stmt = stmt.where(AIUsageLog.created_at >= since)
        return int(self.db.scalar(stmt) or 0)

    def create_ai_suggestion(self, values: dict) -> AISuggestion:
        suggestion = AISuggestion(**values)
        self.db.add(suggestion)
        self.db.commit()
        self.db.refresh(suggestion)
        return suggestion

    def list_trade_categories(self) -> Sequence[TradeCategory]:
        stmt = select(TradeCategory).order_by(asc(TradeCategory.sort_order), asc(TradeCategory.label))
        return self.db.scalars(stmt).all()

    def get_trade_category_by_slug(self, slug: str) -> TradeCategory | None:
        stmt = select(TradeCategory).where(TradeCategory.slug == slug)
        return self.db.scalar(stmt)

    def create_trade_category(self, values: dict) -> TradeCategory:
        category = TradeCategory(**values)
        self.db.add(category)
        self.db.commit()
        self.db.refresh(category)
        return category

    def update_trade_category(self, category: TradeCategory, values: dict) -> TradeCategory:
        for field_name, value in values.items():
            setattr(category, field_name, value)
        self.db.add(category)
        self.db.commit()
        self.db.refresh(category)
        return category

    def list_moderation_listings(self) -> Sequence[Listing]:
        stmt = (
            select(Listing)
            .options(
                selectinload(Listing.images),
                selectinload(Listing.reports),
                selectinload(Listing.seller).selectinload(User.profile),
            )
            .where(
                or_(
                    Listing.moderation_status.notin_(("clear", "approved")),
                    Listing.risk_level == "high",
                    Listing.reports.any(ListingReport.status == "pending"),
                )
            )
            .order_by(desc(Listing.risk_score), desc(Listing.updated_at))
        )
        return self.db.scalars(stmt).all()

    def create_trade_transaction(self, values: dict) -> TradeTransaction:
        transaction = TradeTransaction(**values)
        self.db.add(transaction)
        self.db.commit()
        self.db.refresh(transaction)
        return transaction

    def get_trade_transaction_or_none(self, transaction_id: str) -> TradeTransaction | None:
        return self.db.get(TradeTransaction, transaction_id)

    def list_transactions_for_user(self, user_id: str) -> Sequence[TradeTransaction]:
        stmt = (
            select(TradeTransaction)
            .where(or_(TradeTransaction.seller_id == user_id, TradeTransaction.buyer_id == user_id))
            .order_by(desc(TradeTransaction.updated_at), desc(TradeTransaction.created_at))
        )
        return self.db.scalars(stmt).all()

    def update_trade_transaction(self, transaction: TradeTransaction, values: dict) -> TradeTransaction:
        for field_name, value in values.items():
            setattr(transaction, field_name, value)
        self.db.add(transaction)
        self.db.commit()
        self.db.refresh(transaction)
        return transaction

    def create_decision_feedback(self, values: dict) -> TradeDecisionFeedback:
        feedback = TradeDecisionFeedback(**values)
        self.db.add(feedback)
        self.db.commit()
        self.db.refresh(feedback)
        return feedback

    def list_decision_feedback_for_user(self, user_id: str) -> Sequence[TradeDecisionFeedback]:
        stmt = (
            select(TradeDecisionFeedback)
            .where(TradeDecisionFeedback.user_id == user_id)
            .order_by(desc(TradeDecisionFeedback.created_at))
        )
        return self.db.scalars(stmt).all()

    def marketplace_statistics(self) -> dict:
        week_start = datetime.now(UTC) - timedelta(days=7)
        categories_stmt = (
            select(Listing.category, func.count(Listing.id))
            .where(Listing.status.in_(("available", "reserved")), Listing.moderation_status.in_(PUBLIC_MODERATION_STATUSES))
            .group_by(Listing.category)
            .order_by(desc(func.count(Listing.id)))
            .limit(6)
        )
        category_rows = self.db.execute(categories_stmt).all()
        pickup_stmt = (
            select(Listing.pickup_location, func.count(Listing.id))
            .where(Listing.pickup_location.is_not(None))
            .group_by(Listing.pickup_location)
            .order_by(desc(func.count(Listing.id)))
            .limit(6)
        )
        pickup_rows = self.db.execute(pickup_stmt).all()
        ai_total = self.count_ai_usage_logs(statuses=("succeeded", "failed", "denied"))
        ai_failed = self.count_ai_usage_logs(statuses=("failed", "denied"))
        return {
            "total_users": int(self.db.scalar(select(func.count()).select_from(User)) or 0),
            "active_listings": int(
                self.db.scalar(
                    select(func.count()).select_from(Listing).where(Listing.status == "available")
                )
                or 0
            ),
            "reserved_listings": int(
                self.db.scalar(select(func.count()).select_from(Listing).where(Listing.status == "reserved")) or 0
            ),
            "sold_listings": int(
                self.db.scalar(select(func.count()).select_from(Listing).where(Listing.status == "sold")) or 0
            ),
            "reported_listings": int(
                self.db.scalar(select(func.count(func.distinct(ListingReport.listing_id)))) or 0
            ),
            "new_listings_this_week": int(
                self.db.scalar(select(func.count()).select_from(Listing).where(Listing.created_at >= week_start)) or 0
            ),
            "most_popular_categories": [
                {"category": str(category), "count": int(count)}
                for category, count in category_rows
            ],
            "most_popular_pickup_locations": [
                {"pickup_location": str(location), "count": int(count)}
                for location, count in pickup_rows
                if location
            ],
            "contact_requests_sent": int(
                self.db.scalar(select(func.count()).select_from(TradeContactRequest)) or 0
            ),
            "contact_requests_accepted": int(
                self.db.scalar(
                    select(func.count()).select_from(TradeContactRequest).where(TradeContactRequest.status == "accepted")
                )
                or 0
            ),
            "favorite_count": int(self.db.scalar(select(func.count()).select_from(ListingFavorite)) or 0),
            "report_count": int(self.db.scalar(select(func.count()).select_from(ListingReport)) or 0),
            "ai_generations_used": ai_total,
            "ai_failure_rate": round(ai_failed / ai_total, 4) if ai_total else 0,
        }

    def upsert_listing_embedding(
        self,
        listing_id: str,
        source_text: str,
        model_name: str | None = None,
        embedding_value=None,
    ) -> ListingEmbedding:
        stmt = select(ListingEmbedding).where(ListingEmbedding.listing_id == listing_id)
        embedding = self.db.scalar(stmt)
        if embedding is None:
            embedding = ListingEmbedding(
                listing_id=listing_id,
                embedding=embedding_value,
                model_name=model_name,
                source_text=source_text,
            )
        else:
            embedding.embedding = embedding_value
            embedding.model_name = model_name
            embedding.source_text = source_text

        self.db.add(embedding)
        self.db.commit()
        self.db.refresh(embedding)
        return embedding

    def upsert_wanted_post_embedding(
        self,
        wanted_post_id: str,
        source_text: str,
        model_name: str | None = None,
        embedding_value=None,
    ) -> WantedPostEmbedding:
        stmt = select(WantedPostEmbedding).where(WantedPostEmbedding.wanted_post_id == wanted_post_id)
        embedding = self.db.scalar(stmt)
        if embedding is None:
            embedding = WantedPostEmbedding(
                wanted_post_id=wanted_post_id,
                embedding=embedding_value,
                model_name=model_name,
                source_text=source_text,
            )
        else:
            embedding.embedding = embedding_value
            embedding.model_name = model_name
            embedding.source_text = source_text

        self.db.add(embedding)
        self.db.commit()
        self.db.refresh(embedding)
        return embedding
