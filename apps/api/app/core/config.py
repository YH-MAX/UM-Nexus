from functools import lru_cache
from pathlib import Path

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


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
    allowed_email_domains: tuple[str, ...] = ("siswa.um.edu.my", "um.edu.my")

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

    @property
    def resolved_supabase_jwks_url(self) -> str:
        if self.supabase_jwks_url:
            return self.supabase_jwks_url
        return f"{self.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"


@lru_cache
def get_settings() -> Settings:
    return Settings()
