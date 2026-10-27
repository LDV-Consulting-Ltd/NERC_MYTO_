import os

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import NullPool
from app.config import get_settings

_settings = get_settings()
# Support async: postgresql+psycopg -> postgresql+psycopg (psycopg3 has async)
url = _settings.database_url
if url.startswith("postgresql://") or url.startswith("postgresql+psycopg://"):
    url = url.replace("postgresql://", "postgresql+psycopg://", 1).replace("postgresql+psycopg://", "postgresql+psycopg://", 1)
if "postgresql+psycopg://" in url and "+psycopg" not in url.split(":")[0]:
    pass
# Ensure async driver for SQLAlchemy 2 async
async_url = url.replace("postgresql+psycopg://", "postgresql+psycopg://", 1)

# Vercel / serverless: NullPool + no prepared statements (Supabase transaction pooler :6543).
# Session pooler (:5432) caps at ~15 clients and is exhausted by default SQLAlchemy pools.
_serverless = os.environ.get("VERCEL") == "1"
_engine_kwargs: dict = {
    "echo": False,
    "pool_pre_ping": True,
}
if _serverless:
    _engine_kwargs["poolclass"] = NullPool
    _engine_kwargs["connect_args"] = {"prepare_threshold": None}
else:
    _engine_kwargs["pool_size"] = 5
    _engine_kwargs["max_overflow"] = 10

engine = create_async_engine(async_url, **_engine_kwargs)
_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False, autoflush=False)
Base = declarative_base()


class _GuardedSessionFactory:
    """Ensure Vercel misconfig is caught for every session, not only Depends(get_db)."""

    def __call__(self, *args, **kwargs):
        _settings.require_remote_database()
        return _session_factory(*args, **kwargs)


AsyncSessionLocal = _GuardedSessionFactory()


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
