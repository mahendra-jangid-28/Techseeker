from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


def normalize_database_uri(uri: str) -> str:
    """
    Normalizes PostgreSQL connection URI schemes to ensure compatibility with psycopg 3.
    Converts 'postgres://' or 'postgresql://' to 'postgresql+psycopg://'.
    """
    if not uri:
        return uri
    if uri.startswith("postgres://"):
        return uri.replace("postgres://", "postgresql+psycopg://", 1)
    if uri.startswith("postgresql://") and not uri.startswith("postgresql+"):
        return uri.replace("postgresql://", "postgresql+psycopg://", 1)
    return uri


class Settings(BaseSettings):
    APP_NAME: str = "TechSeeker API"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False

    # Database URLs (DATABASE_URL = pooled connection, DIRECT_URL = unpooled for Alembic migrations)
    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/techseeker"
    DIRECT_URL: str = ""

    # Cache
    REDIS_URL: str = "redis://localhost:6379/0"

    # Authentication & Security
    SECRET_KEY: str = "techseeker-insecure-dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # AI & Code Runner Services
    GEMINI_API_KEYS: str = "mock_key"
    RUNNER_SERVICE_URL: str = "http://127.0.0.1:8001/execute"

    # CORS & Whitelist (exact domains, comma-separated)
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    # Google OAuth Credentials
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    @property
    def sync_database_url(self) -> str:
        return normalize_database_uri(self.DATABASE_URL)

    @property
    def sync_migration_url(self) -> str:
        """
        Returns DIRECT_URL for running Alembic migrations (critical for Neon PgBouncer transaction mode).
        Falls back to normalized DATABASE_URL if DIRECT_URL is not set.
        """
        if self.DIRECT_URL.strip():
            return normalize_database_uri(self.DIRECT_URL)
        return self.sync_database_url

    @property
    def cors_origins_list(self) -> List[str]:
        return [
            origin.strip()
            for origin in self.CORS_ORIGINS.split(",")
            if origin.strip()
        ]

    model_config = SettingsConfigDict(
        env_file=(".env", "apps/api/.env"),
        extra="ignore",
    )


settings = Settings()