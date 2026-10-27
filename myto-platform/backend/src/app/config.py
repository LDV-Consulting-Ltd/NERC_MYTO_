import os
from functools import lru_cache

from pydantic_settings import BaseSettings

_LOCAL_DB_DEFAULT = "postgresql+psycopg://myto:myto@localhost:5432/myto"


class Settings(BaseSettings):
    database_url: str = _LOCAL_DB_DEFAULT
    cron_secret: str = ""
    scheduler_cooldown_minutes: int = 60
    geocode_user_agent: str = "MYTO-Platform/1.0"
    geocode_rate_limit_per_minute: int = 60
    geocode_timeout_seconds: float = 30.0
    download_concurrency: int = 12
    resolve_chunk_size: int = 25
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    log_level: str = "INFO"
    myto_list_base_url: str = "https://nerc.gov.ng/resource-category/myto"
    tanna_connector_token: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"

    def require_remote_database(self) -> None:
        """On Vercel, refuse the local Docker default so misconfig fails loudly."""
        if os.environ.get("VERCEL") != "1":
            return
        url = (self.database_url or "").strip()
        if not url or url == _LOCAL_DB_DEFAULT or "@localhost:" in url or "@127.0.0.1:" in url:
            raise RuntimeError(
                "DATABASE_URL is unset or points at localhost. "
                "Add a hosted Postgres URL in the Vercel project env "
                "(Production + Preview), then redeploy."
            )


@lru_cache
def get_settings() -> Settings:
    return Settings()
