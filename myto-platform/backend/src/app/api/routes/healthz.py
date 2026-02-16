"""
Minimal liveness endpoint. Does NOT import app.db or any heavy deps.
Use for connectivity check so it never returns 500 due to DB/config.
"""
from datetime import datetime, timezone

from fastapi import APIRouter

router = APIRouter()

VERSION = "1.0.0"
SERVICE_NAME = "myto-platform-backend"


@router.get("/healthz")
async def healthz():
    """Returns 200 if the app process is running. Never touches DB."""
    return {
        "status": "ok",
        "service": SERVICE_NAME,
        "time": datetime.now(timezone.utc).isoformat(),
        "version": VERSION,
    }
