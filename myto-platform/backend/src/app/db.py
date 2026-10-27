from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
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

engine = create_async_engine(
    async_url,
    echo=False,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)
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
