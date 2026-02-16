from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.db import get_db
from app.api.schemas import envelope, get_snapshot_meta

router = APIRouter(tags=["DQ"])

DQ_RULES = [
    {"rule_id": "dq_disco_required", "name": "Disco code required", "definition": "disco_code must be non-empty."},
    {"rule_id": "dq_year_valid", "name": "Year in range", "definition": "year must be between 2000 and 2100."},
    {"rule_id": "dq_min_hours_range", "name": "Min supply hours range", "definition": "min_supply_hours must be between 0 and 8760."},
]


@router.get("/summary")
async def dq_summary(db: AsyncSession = Depends(get_db), run_id: str | None = None):
    snapshot_run_id, refreshed_at = await get_snapshot_meta(db)
    if run_id:
        r = await db.execute(
            text("SELECT dq_status, count(*) FROM silver.service_level_commitments_dq WHERE run_id = :rid GROUP BY dq_status"),
            {"rid": run_id},
        )
    else:
        r = await db.execute(
            text("""
                SELECT dq_status, count(*) FROM silver.service_level_commitments_dq
                WHERE run_id = (SELECT run_id FROM silver.service_level_commitments_geo_latest LIMIT 1)
                GROUP BY dq_status
            """)
        )
    rows = r.all()
    total = sum(x[1] for x in rows)
    pass_count = next((x[1] for x in rows if x[0] == "pass"), 0)
    score = round(100 * pass_count / total, 1) if total else 100
    data = {"dq_score": score, "total_records": total, "by_status": {x[0]: x[1] for x in rows}}
    return envelope(data, snapshot_run_id=snapshot_run_id if not run_id else None, refreshed_at=refreshed_at if not run_id else None)


@router.get("/issues")
async def dq_issues(
    db: AsyncSession = Depends(get_db),
    run_id: str | None = None,
    status: str = "fail",
    limit: int = 200,
    offset: int = 0,
):
    snapshot_run_id, refreshed_at = await get_snapshot_meta(db)
    if run_id:
        r = await db.execute(
            text("SELECT record_id, dq_status, dq_reasons, created_at FROM silver.service_level_commitments_dq WHERE run_id = :rid AND dq_status = :status ORDER BY created_at DESC LIMIT :lim OFFSET :off"),
            {"rid": run_id, "status": status, "lim": limit, "off": offset},
        )
    else:
        r = await db.execute(
            text("""
                SELECT record_id, dq_status, dq_reasons, created_at, run_id FROM silver.service_level_commitments_dq
                WHERE run_id = (SELECT run_id FROM silver.service_level_commitments_geo_latest LIMIT 1) AND dq_status = :status
                ORDER BY created_at DESC LIMIT :lim OFFSET :off
            """),
            {"status": status, "lim": limit, "off": offset},
        )
    rows = r.all()
    data = [{"record_id": x[0], "dq_status": x[1], "dq_reasons": x[2], "created_at": x[3].isoformat() if hasattr(x[3], "isoformat") else None, "run_id": str(x[4]) if len(x) > 4 else None} for x in rows]
    return envelope(data, snapshot_run_id=snapshot_run_id, refreshed_at=refreshed_at, count=len(data), limit=limit, offset=offset)


@router.get("/rules")
async def dq_rules():
    return envelope(DQ_RULES, count=len(DQ_RULES))
