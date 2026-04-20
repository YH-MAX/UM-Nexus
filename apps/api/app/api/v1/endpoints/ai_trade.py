from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.trade_intelligence import EnrichListingAccepted, TradeIntelligenceResultStatus
from app.services.trade_intelligence import create_pending_trade_intelligence_run, get_trade_result_status
from app.tasks.trade_intelligence_tasks import compute_trade_intelligence_task


router = APIRouter()


@router.post("/trade/enrich-listing/{listing_id}", response_model=EnrichListingAccepted, status_code=202)
def enrich_listing_endpoint(
    listing_id: UUID,
    db: Session = Depends(get_db),
) -> EnrichListingAccepted:
    accepted = create_pending_trade_intelligence_run(db, str(listing_id))
    compute_trade_intelligence_task.delay(accepted.listing_id, accepted.agent_run_id)
    return accepted


@router.get("/trade/result/{listing_id}", response_model=TradeIntelligenceResultStatus)
def get_trade_result_endpoint(
    listing_id: UUID,
    db: Session = Depends(get_db),
) -> TradeIntelligenceResultStatus:
    return get_trade_result_status(db, str(listing_id))
