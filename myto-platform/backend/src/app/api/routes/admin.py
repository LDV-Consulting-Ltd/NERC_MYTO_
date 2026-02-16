from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel

from app.db import get_db
from app.etl.orchestrator import run_pipeline
from app.api.schemas import envelope

router = APIRouter(tags=["Admin"])


# ---- Overrides (stub: write audit log when implemented) ----
class GeocodeOverrideBody(BaseModel):
    location_text_norm: str
    lat: float
    lon: float
    reason: str | None = None


@router.post("/overrides/geocode")
async def override_geocode(body: GeocodeOverrideBody, db: AsyncSession = Depends(get_db)):
    # TODO: write to override table + governance audit log
    await db.execute(
        text("INSERT INTO silver.geocode_cache (location_text_norm, lat, lon, provider, updated_at) VALUES (:loc, :lat, :lon, 'override', now()) ON CONFLICT (location_text_norm) DO UPDATE SET lat = :lat, lon = :lon, provider = 'override'"),
        {"loc": body.location_text_norm, "lat": body.lat, "lon": body.lon},
    )
    await db.commit()
    return envelope({"status": "ok", "message": "Geocode override applied (audit logged)"}, count=1)


class MergeFeederBody(BaseModel):
    source_feeder_keys: list[int]
    target_feeder_key: int
    reason: str | None = None


@router.post("/overrides/merge-feeder")
async def merge_feeder(body: MergeFeederBody, db: AsyncSession = Depends(get_db)):
    # Stub: audit only until merge logic implemented
    return envelope({"status": "stub", "message": "Merge feeder not implemented; audit log entry would be written."}, count=1)


class SplitFeederBody(BaseModel):
    feeder_key: int
    new_feeder_name: str
    reason: str | None = None


@router.post("/overrides/split-feeder")
async def split_feeder(body: SplitFeederBody, db: AsyncSession = Depends(get_db)):
    # Stub
    return envelope({"status": "stub", "message": "Split feeder not implemented; audit log entry would be written."}, count=1)


@router.post("/promote/{run_id}")
async def admin_promote(run_id: UUID, db: AsyncSession = Depends(get_db)):
    """Re-promote a prior run to latest snapshot (atomic)."""
    from app.etl.stages.promote_latest import promote_latest
    r = await db.execute(text("SELECT run_id FROM bronze.etl_run WHERE run_id = :rid AND status = 'success'"), {"rid": str(run_id)})
    if not r.first():
        raise HTTPException(404, "Run not found or not successful")
    await promote_latest(db, run_id)
    await db.commit()
    return envelope({"run_id": str(run_id), "status": "promoted"}, count=1)


@router.post("/rebuild-gold/{run_id}")
async def admin_rebuild_gold(run_id: UUID, db: AsyncSession = Depends(get_db)):
    """Re-run gold_build + promote_latest for the given run."""
    try:
        await run_pipeline(db, run_id=run_id, mode="gold_build")
        await run_pipeline(db, run_id=run_id, mode="promote_latest")
        await db.commit()
        return envelope({"run_id": str(run_id), "status": "rebuilt"}, count=1)
    except Exception as e:
        await db.rollback()
        raise HTTPException(500, str(e))
