from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://myto:myto@localhost:5432/myto"
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

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
