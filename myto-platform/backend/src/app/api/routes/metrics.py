from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from datetime import datetime, timedelta

from app.db import get_db
from app.api.schemas import envelope, get_snapshot_meta

router = APIRouter(tags=["Metrics"])


@router.get("/pipeline/performance")
async def pipeline_performance(db: AsyncSession = Depends(get_db), runs: int = 10):
    r = await db.execute(
        text("""
            SELECT run_id, stage_name, duration_ms, output_count, error_count, status
            FROM bronze.etl_stage
            WHERE run_id IN (SELECT run_id FROM bronze.etl_run ORDER BY started_at DESC LIMIT :runs)
            ORDER BY run_id, stage_name
        """),
        {"runs": runs},
    )
    rows = r.all()
    r2 = await db.execute(
        text("""
            SELECT count(*), count(*) FILTER (WHERE status = 'success') FROM bronze.etl_run
            WHERE run_id IN (SELECT run_id FROM bronze.etl_run ORDER BY started_at DESC LIMIT :runs)
        """),
        {"runs": runs},
    )
    run_row = r2.first()
    total_runs = run_row[0] or 0
    success_runs = run_row[1] or 0
    success_rate = round(100 * success_runs / total_runs, 0) if total_runs else 0
    data = {
        "stages": [{"run_id": str(x[0]), "stage_name": x[1], "duration_ms": x[2], "output_count": x[3], "error_count": x[4], "status": x[5]} for x in rows],
        "success_rate": success_rate,
    }
    return envelope(data, count=len(rows))


@router.get("/pipeline/timeseries")
async def pipeline_timeseries(db: AsyncSession = Depends(get_db), days: int = 7):
    """Last N days: run count and success rate per day."""
    r = await db.execute(
        text("""
            SELECT date_trunc('day', started_at) as day, count(*), count(*) FILTER (WHERE status = 'success') as success_count
            FROM bronze.etl_run
            WHERE started_at >= :since
            GROUP BY 1 ORDER BY 1
        """),
        {"since": datetime.utcnow() - timedelta(days=days)},
    )
    rows = r.all()
    data = [{"day": str(row[0]), "run_count": row[1], "success_count": row[2]} for row in rows]
    return envelope(data, count=len(data))


@router.get("/extraction/methods")
async def extraction_methods(db: AsyncSession = Depends(get_db)):
    r = await db.execute(text("SELECT method, count(*) FROM bronze.pdf_table_raw GROUP BY method"))
    rows = r.all()
    data = {row[0] or "unknown": row[1] for row in rows}
    return envelope(data, count=len(rows))


@router.get("/geocode")
async def geocode_metrics(db: AsyncSession = Depends(get_db)):
    snapshot_run_id, refreshed_at = await get_snapshot_meta(db)
    r = await db.execute(text("SELECT count(*) FROM silver.geocode_cache"))
    cache_count = (r.scalars().first() or 0)
    r2 = await db.execute(text("SELECT count(*) FROM silver.service_level_commitments_geo_latest WHERE lat IS NOT NULL AND lon IS NOT NULL"))
    geo_count = (r2.scalars().first() or 0)
    r3 = await db.execute(text("SELECT count(*) FROM silver.service_level_commitments_geo_latest"))
    total = (r3.scalars().first() or 0)
    hit_rate = round(100 * geo_count / total, 1) if total else 0
    data = {"cache_entries": cache_count, "geocoded_latest_count": geo_count, "total_latest": total, "geocode_coverage_pct": hit_rate, "cache_hit_rate": None, "provider_share": {}}
    return envelope(data, snapshot_run_id=snapshot_run_id, refreshed_at=refreshed_at)
