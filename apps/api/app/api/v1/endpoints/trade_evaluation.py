from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.trade_evaluation_service import (
    benchmark_case_detail,
    get_benchmark_case_detail,
    get_evaluation_summary,
    list_benchmark_cases,
    run_trade_benchmark,
    seed_benchmark_cases,
)


router = APIRouter()


@router.post("/run")
def run_trade_evaluation_endpoint(
    payload: dict | None = Body(default=None),
    db: Session = Depends(get_db),
) -> dict:
    case_ids = payload.get("case_ids") if isinstance(payload, dict) else None
    return run_trade_benchmark(db, case_ids=case_ids)


@router.get("/summary")
def get_trade_evaluation_summary_endpoint(db: Session = Depends(get_db)) -> dict:
    return get_evaluation_summary(db)


@router.get("/cases")
def list_trade_evaluation_cases_endpoint(db: Session = Depends(get_db)) -> list[dict]:
    cases = seed_benchmark_cases(db)
    return [benchmark_case_detail(db, benchmark_case) for benchmark_case in cases]


@router.get("/cases/{case_id}")
def get_trade_evaluation_case_endpoint(
    case_id: UUID,
    db: Session = Depends(get_db),
) -> dict:
    detail = get_benchmark_case_detail(db, str(case_id))
    if "error" in detail:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail["error"])
    return detail
