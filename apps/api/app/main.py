from fastapi import FastAPI

from app.api.v1.router import api_router
from app.core.config import get_settings


def create_application() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="UM Nexus API",
        version="0.2.0",
        debug=settings.app_env == "development",
    )

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(api_router, prefix="/api/v1")
    return app


app = create_application()
