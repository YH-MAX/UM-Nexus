from functools import lru_cache
from pathlib import Path
from typing import Annotated

from pydantic import AliasChoices, Field, field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

from app.core.exceptions import ConfigurationError


ZAI_PROVIDER_NAMES = {"zai", "z.ai", "zai-glm", "zai_glm"}


def find_env_file() -> str | None:
    current = Path(__file__).resolve()

    for parent in current.parents:
        candidate = parent / ".env"
        if candidate.exists():
            return str(candidate)

    return None


class Settings(BaseSettings):
    app_env: str = "development"
    database_url: str = "postgresql+psycopg://umnexus:umnexus@localhost:5432/umnexus"
    redis_url: str = "redis://localhost:6379/0"
    supabase_url: str = "https://your-project-ref.supabase.co"
    supabase_anon_key: str = Field(
        default="",
        validation_alias=AliasChoices("SUPABASE_ANON_KEY", "SUPABASE_PUBLISHABLE_KEY"),
    )
    supabase_service_role_key: str = ""
    supabase_jwks_url: str | None = None
    allowed_email_domains: Annotated[tuple[str, ...], NoDecode] = ("siswa.um.edu.my", "um.edu.my")
    upload_storage_dir: str = "storage/uploads"
    upload_public_base_url: str = "http://localhost:8001/uploads"
    max_upload_file_size_bytes: int = 5 * 1024 * 1024
    glm_provider: str = "demo"
    glm_api_url: str | None = None
    glm_api_key: str | None = None
    glm_model: str = "glm-4.5v"
    glm_timeout_seconds: float = 30.0
    glm_temperature: float = 0.2
    zai_api_key: str = ""
    zai_base_url: str | None = None
    zai_model: str = "glm-4.6v"
    zai_timeout_seconds: int = 60
    zai_max_retries: int = 2

    model_config = SettingsConfigDict(
        env_file=find_env_file(),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        if value.startswith("postgres://"):
            return value.replace("postgres://", "postgresql+psycopg://", 1)
        if value.startswith("postgresql://") and "+psycopg" not in value:
            return value.replace("postgresql://", "postgresql+psycopg://", 1)
        return value

    @field_validator("allowed_email_domains", mode="before")
    @classmethod
    def parse_allowed_email_domains(cls, value: str | tuple[str, ...] | list[str]) -> tuple[str, ...]:
        if isinstance(value, str):
            return tuple(domain.strip().lower() for domain in value.split(",") if domain.strip())
        if isinstance(value, list):
            return tuple(domain.strip().lower() for domain in value if domain.strip())
        return tuple(domain.strip().lower() for domain in value if domain.strip())

    @model_validator(mode="after")
    def validate_zai_provider_selection(self) -> "Settings":
        if self.glm_provider.lower() in ZAI_PROVIDER_NAMES:
            missing = self.missing_zai_settings()
            if missing:
                joined = ", ".join(missing)
                raise ValueError(f"Missing required Z.AI settings for GLM_PROVIDER=zai: {joined}.")
        return self

    @property
    def resolved_supabase_jwks_url(self) -> str:
        if self.supabase_jwks_url:
            return self.supabase_jwks_url
        return f"{self.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"

    @property
    def is_zai_provider_selected(self) -> bool:
        return self.glm_provider.lower() in ZAI_PROVIDER_NAMES

    @property
    def should_use_zai_provider(self) -> bool:
        return self.is_zai_provider_selected or bool(self.zai_api_key.strip())

    @property
    def ZAI_API_KEY(self) -> str:
        return self.zai_api_key

    @property
    def ZAI_BASE_URL(self) -> str:
        return self.zai_base_url or ""

    @property
    def ZAI_MODEL(self) -> str:
        return self.zai_model

    @property
    def ZAI_TIMEOUT_SECONDS(self) -> int:
        return self.zai_timeout_seconds

    @property
    def ZAI_MAX_RETRIES(self) -> int:
        return self.zai_max_retries

    def missing_zai_settings(self) -> list[str]:
        required = {
            "ZAI_API_KEY": self.zai_api_key,
            "ZAI_MODEL": self.zai_model,
        }
        return [name for name, value in required.items() if not value or not str(value).strip()]

    def validate_runtime_settings(self) -> None:
        if not self.is_zai_provider_selected:
            return

        missing = self.missing_zai_settings()
        if missing:
            joined = ", ".join(missing)
            raise ConfigurationError(f"Missing required Z.AI settings for backend startup: {joined}.")


@lru_cache
def get_settings() -> Settings:
    return Settings()
