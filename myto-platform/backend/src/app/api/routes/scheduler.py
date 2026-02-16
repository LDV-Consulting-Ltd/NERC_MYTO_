from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text, desc
from datetime import datetime, timedelta

from app.db import get_db
from app.config import get_settings
from app.models.bronze import EtlRun
from app.etl.orchestrator import run_pipeline
from app.api.schemas import envelope

router = APIRouter(tags=["Scheduler"])


@router.post("/trigger")
async def scheduler_trigger(
    x_cron_secret: str | None = Header(None, alias="X-CRON-SECRET"),
    db: AsyncSession = Depends(get_db),
):
    settings = get_settings()
    if not settings.cron_secret or x_cron_secret != settings.cron_secret:
        raise HTTPException(403, "Invalid or missing X-CRON-SECRET")
    r = await db.execute(select(EtlRun).where(EtlRun.status == "running").limit(1))
    if r.scalars().first():
        raise HTTPException(409, "A run is already in progress")
    r2 = await db.execute(
        select(EtlRun).where(EtlRun.status == "success").order_by(desc(EtlRun.finished_at)).limit(1)
    )
    last = r2.scalars().first()
    if last and last.finished_at:
        cooldown = timedelta(minutes=settings.scheduler_cooldown_minutes)
        if datetime.now(last.finished_at.tzinfo) - last.finished_at < cooldown:
            raise HTTPException(409, "Last successful run within cooldown window")
    run = EtlRun(status="running", notes="scheduler")
    db.add(run)
    await db.flush()
    run_id = run.run_id
    try:
        await run_pipeline(db, run_id=run_id, mode="full", notes="scheduler")
    except Exception as e:
        await db.rollback()
        raise HTTPException(500, str(e))
    return envelope({"run_id": str(run_id), "status": "completed"}, count=1)


@router.get("/status")
async def scheduler_status(db: AsyncSession = Depends(get_db)):
    settings = get_settings()
    enabled = bool(settings.cron_secret)
    r = await db.execute(select(EtlRun).where(EtlRun.status == "running").limit(1))
    running = r.scalars().first()
    r2 = await db.execute(select(EtlRun).where(EtlRun.status == "success").order_by(desc(EtlRun.finished_at)).limit(1))
    last = r2.scalars().first()
    last_triggered = last.finished_at.isoformat() if last and last.finished_at else None
    next_estimate = None
    if last and last.finished_at:
        next_estimate = (last.finished_at + timedelta(days=1)).replace(hour=5, minute=0, second=0, microsecond=0).isoformat()
    data = {"enabled": enabled, "next_run_estimate": next_estimate, "last_triggered": last_triggered, "currently_running": running is not None}
    return envelope(data)
