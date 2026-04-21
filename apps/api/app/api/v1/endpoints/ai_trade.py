from uuid import UUID

import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import require_app_role, require_authenticated_user
from app.core.config import get_settings
from app.db.session import get_db
from app.integrations.glm_client import ZAIGLMClient
from app.models import AppRole
from app.schemas.trade_intelligence import EnrichListingAccepted, GLMTestResponse, TradeIntelligenceResultStatus
from app.services.trade_evaluation import run_trade_evaluation
from app.services.trade_intelligence import create_pending_trade_intelligence_run, get_trade_result_status
from app.tasks.trade_tasks import compute_trade_intelligence_task


router = APIRouter()
logger = logging.getLogger(__name__)


# Development-only endpoint for backend Z.AI connectivity checks.
# Remove or protect this before exposing admin surfaces publicly.
@router.get("/trade/test-glm", response_model=GLMTestResponse)
def test_glm_endpoint(_admin=Depends(require_app_role(AppRole.ADMIN))) -> GLMTestResponse:
    settings = get_settings()
    try:
        client = ZAIGLMClient(settings)
        response_text = client.simple_test()
        preview = response_text[:240]
        return GLMTestResponse(success=True, model=client.model_name, message_preview=preview, response_text=preview)
    except Exception as exc:
        return GLMTestResponse(success=False, model=settings.zai_model, error_message=str(exc))


@router.post("/trade/enrich-listing/{listing_id}", response_model=EnrichListingAccepted, status_code=202)
def enrich_listing_endpoint(
    listing_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_authenticated_user),
) -> EnrichListingAccepted:
    accepted = create_pending_trade_intelligence_run(db, str(listing_id), current_user)
    try:
        compute_trade_intelligence_task.delay(accepted.listing_id, accepted.agent_run_id)
    except Exception as exc:
        # In local demo/test mode Celery may run eagerly, so provider errors can surface
        # inside the request thread after the task has already marked the run failed.
        logger.warning("Trade Intelligence task failed during eager execution: %s", exc)
    return accepted


@router.get("/trade/result/{listing_id}", response_model=TradeIntelligenceResultStatus)
def get_trade_result_endpoint(
    listing_id: UUID,
    db: Session = Depends(get_db),
) -> TradeIntelligenceResultStatus:
    return get_trade_result_status(db, str(listing_id))


@router.post("/trade/evaluate")
def evaluate_trade_intelligence_endpoint(db: Session = Depends(get_db)) -> dict:
    return run_trade_evaluation(db)
