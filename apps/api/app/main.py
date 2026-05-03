from pathlib import Path
from uuid import uuid4

from fastapi import Depends, FastAPI, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.db.session import get_db


def create_application() -> FastAPI:
    settings = get_settings()
    settings.validate_runtime_settings()
    app = FastAPI(
        title="UM Nexus API",
        version="0.2.0",
        debug=settings.app_env == "development",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.cors_allowed_origins),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    Path(settings.upload_storage_dir).mkdir(parents=True, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=settings.upload_storage_dir), name="uploads")

    @app.middleware("http")
    async def add_product_headers(request: Request, call_next):
        request_id = request.headers.get("x-request-id", str(uuid4()))
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response

    @app.get("/health")
    def health() -> dict[str, str]:
        return {
            "service": "um-nexus-api",
            "status": "ok",
            "environment": settings.app_env,
        }

    @app.get("/health/ready")
    def readiness(response: Response, db: Session = Depends(get_db)) -> dict[str, object]:
        checks: dict[str, str] = {
            "database": "ok",
            "storage": "ok" if Path(settings.upload_storage_dir).exists() else "missing",
            "glm_provider": settings.glm_provider,
        }

        try:
            db.execute(text("SELECT 1"))
        except SQLAlchemyError:
            checks["database"] = "error"

        is_ready = checks["database"] == "ok" and checks["storage"] == "ok"
        if not is_ready:
            response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

        return {
            "service": "um-nexus-api",
            "status": "ready" if is_ready else "degraded",
            "checks": checks,
        }

    app.include_router(api_router, prefix="/api/v1")
    return app


app = create_application()
