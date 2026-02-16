from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.db import get_db
from app.api.schemas import envelope, get_snapshot_meta

router = APIRouter(tags=["Governance"])


@router.get("/lineage")
async def lineage():
    data = {
        "paths": [
            {"metric": "min_supply_hours", "gold": "gold.fact_supply_commitment", "silver": "silver.service_level_commitments_geo", "bronze": "bronze.pdf_table_raw", "source": "pdf_url, page_no"},
        ]
    }
    return envelope(data, count=len(data["paths"]))


@router.get("/audit")
async def audit(db: AsyncSession = Depends(get_db), limit: int = 100):
    r = await db.execute(text("SELECT run_id, refreshed_at FROM silver.service_level_commitments_geo_latest LIMIT 1"))
    row = r.first()
    audit_list = [{"run_id": str(row[0]), "refreshed_at": row[1].isoformat() if hasattr(row[1], "isoformat") else None, "event": "promotion"}] if row else []
    return envelope(audit_list, count=len(audit_list), limit=limit)


@router.get("/policies")
async def policies():
    data = {
        "snapshot_policy": "Latest snapshot updated on successful run promote (atomic truncate+insert).",
        "retention_policy": "Run history retained; configure per environment.",
        "reproducibility": "run_id + git_sha + stage meta for traceability.",
    }
    return envelope(data)
