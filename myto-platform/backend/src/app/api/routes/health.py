import asyncio
import logging
from datetime import datetime, timezone

from fastapi import APIRouter
from sqlalchemy import text

from app.db import engine

router = APIRouter()
logger = logging.getLogger(__name__)

VERSION = "1.0.0"
DB_PING_TIMEOUT = 2.0


@router.get("/health")
async def health():
    """
    Detailed health: attempts a fast DB ping (SELECT 1) with short timeout.
    Always returns 200. On DB failure returns status='degraded', db='down'.
    """
    try:
        async with asyncio.timeout(DB_PING_TIMEOUT):
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
        return {
            "status": "ok",
            "db": "ok",
            "version": VERSION,
            "time": datetime.now(timezone.utc).isoformat(),
        }
    except asyncio.TimeoutError as e:
        logger.warning("Health DB ping timeout: %s", e)
        return {
            "status": "degraded",
            "db": "down",
            "error": "db ping timeout",
            "version": VERSION,
            "time": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        logger.warning("Health DB ping failed: %s", e, exc_info=True)
        return {
            "status": "degraded",
            "db": "down",
            "error": str(e),
            "version": VERSION,
            "time": datetime.now(timezone.utc).isoformat(),
        }
