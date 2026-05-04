from uuid import UUID

import logging
import json

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_app_role, require_authenticated_user
from app.core.config import get_settings
from app.db.session import get_db
from app.integrations.glm_client import ZAIGLMClient
from app.models import AppRole
from app.schemas.trade_intelligence import (
    EnrichListingAccepted,
    GLMTestResponse,
    PriceSimulationRequest,
    PriceSimulationResponse,
    TradeIntelligenceResultStatus,
    TradeProviderStatus,
)
from app.schemas.sell_agent import SellAgentDraftResponse, SellAgentPublishRequest, SellAgentPublishResponse, SellAgentSellerContext
from app.services.sell_agent_service import generate_sell_agent_draft, publish_sell_agent_draft
from app.services.trade_evaluation import run_trade_evaluation
from app.services.trade_intelligence import (
    create_pending_trade_intelligence_run,
    get_trade_provider_status,
    get_trade_result_status,
    simulate_listing_price,
)
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


@router.get("/trade/provider-status", response_model=TradeProviderStatus)
def provider_status_endpoint(
    live_check: bool = Query(default=False),
    db: Session = Depends(get_db),
) -> TradeProviderStatus:
    return get_trade_provider_status(db, live_check=live_check)


@router.post("/trade/sell-agent/draft", response_model=SellAgentDraftResponse)
async def sell_agent_draft_endpoint(
    seller_context: str = Form(...),
    images: list[UploadFile] | None = File(default=None),
    db: Session = Depends(get_db),
    current_user=Depends(require_authenticated_user),
) -> SellAgentDraftResponse:
    try:
        context_payload = json.loads(seller_context)
        context = SellAgentSellerContext.model_validate(context_payload)
    except (json.JSONDecodeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="seller_context must be valid JSON.",
        ) from exc
    return await generate_sell_agent_draft(
        db,
        seller_context=context,
        image_uploads=images or [],
        current_user=current_user,
    )


@router.post("/trade/sell-agent/publish", response_model=SellAgentPublishResponse, status_code=status.HTTP_201_CREATED)
def sell_agent_publish_endpoint(
    payload: SellAgentPublishRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_authenticated_user),
) -> SellAgentPublishResponse:
    return publish_sell_agent_draft(db, payload=payload, current_user=current_user)


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


@router.post("/trade/price-simulation/{listing_id}", response_model=PriceSimulationResponse)
def simulate_listing_price_endpoint(
    listing_id: UUID,
    payload: PriceSimulationRequest,
    db: Session = Depends(get_db),
) -> PriceSimulationResponse:
    return simulate_listing_price(db, str(listing_id), payload.proposed_price)


@router.post("/trade/evaluate")
def evaluate_trade_intelligence_endpoint(
    db: Session = Depends(get_db),
    _admin=Depends(require_app_role(AppRole.ADMIN)),
) -> dict:
    return run_trade_evaluation(db)
