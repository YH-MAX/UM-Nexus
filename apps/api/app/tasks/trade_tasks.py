from app.db.session import SessionLocal
from app.services.trade_intelligence import (
    compute_trade_intelligence,
    create_or_update_listing_embedding,
    create_or_update_wanted_post_embedding,
    generate_listing_source_text as generate_listing_source_text_service,
    generate_wanted_post_source_text as generate_wanted_post_source_text_service,
    recompute_matches_for_listing,
)
from app.services.trade_service import expire_stale_contact_requests as expire_stale_contact_requests_service
from app.tasks.celery_app import celery_app


@celery_app.task(name="trade.generate_listing_source_text")
def generate_listing_source_text(listing_id: str) -> str:
    with SessionLocal() as db:
        return generate_listing_source_text_service(db, listing_id)


@celery_app.task(name="trade.generate_wanted_post_source_text")
def generate_wanted_post_source_text(wanted_post_id: str) -> str:
    with SessionLocal() as db:
        return generate_wanted_post_source_text_service(db, wanted_post_id)


@celery_app.task(name="trade.create_or_update_listing_embedding")
def create_or_update_listing_embedding_task(listing_id: str) -> str:
    with SessionLocal() as db:
        create_or_update_listing_embedding(db, listing_id)
    return listing_id


@celery_app.task(name="trade.create_or_update_wanted_post_embedding")
def create_or_update_wanted_post_embedding_task(wanted_post_id: str) -> str:
    with SessionLocal() as db:
        create_or_update_wanted_post_embedding(db, wanted_post_id)
    return wanted_post_id


@celery_app.task(name="trade.compute_trade_intelligence")
def compute_trade_intelligence_task(listing_id: str, agent_run_id: str | None = None) -> str:
    with SessionLocal() as db:
        compute_trade_intelligence(db, listing_id, agent_run_id)
    return listing_id


@celery_app.task(name="trade.recompute_matches_for_listing")
def recompute_matches_for_listing_task(listing_id: str) -> str:
    with SessionLocal() as db:
        recompute_matches_for_listing(db, listing_id)
    return listing_id


@celery_app.task(name="trade.expire_stale_contact_requests")
def expire_stale_contact_requests_task() -> int:
    with SessionLocal() as db:
        return expire_stale_contact_requests_service(db)
