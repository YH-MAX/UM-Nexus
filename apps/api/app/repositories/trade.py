from __future__ import annotations

from collections.abc import Sequence

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session, selectinload

from app.models import (
    AgentOutput,
    AgentRun,
    HistoricalSale,
    Listing,
    ListingEmbedding,
    ListingImage,
    ListingReport,
    MediaAsset,
    TradeMatch,
    WantedPost,
    WantedPostEmbedding,
)


class TradeRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create_listing(self, seller_id: str, values: dict) -> Listing:
        listing = Listing(seller_id=seller_id, **values)
        self.db.add(listing)
        self.db.commit()
        return self.get_listing_or_none(listing.id) or listing

    def list_listings(self, status: str = "active") -> Sequence[Listing]:
        stmt = (
            select(Listing)
            .options(selectinload(Listing.images))
            .where(Listing.status == status)
            .order_by(desc(Listing.created_at))
        )
        return self.db.scalars(stmt).all()

    def get_listing_or_none(self, listing_id: str) -> Listing | None:
        stmt = (
            select(Listing)
            .options(selectinload(Listing.images), selectinload(Listing.reports))
            .where(Listing.id == listing_id)
        )
        return self.db.scalar(stmt)

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

    def list_wanted_posts(self, status: str = "active") -> Sequence[WantedPost]:
        stmt = select(WantedPost).where(WantedPost.status == status).order_by(desc(WantedPost.created_at))
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

    def list_matches_for_listing(self, listing_id: str) -> Sequence[TradeMatch]:
        stmt = (
            select(TradeMatch)
            .options(selectinload(TradeMatch.wanted_post))
            .where(TradeMatch.listing_id == listing_id)
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

    def create_listing_report(self, values: dict) -> ListingReport:
        report = ListingReport(**values)
        self.db.add(report)
        self.db.commit()
        self.db.refresh(report)
        return report

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
