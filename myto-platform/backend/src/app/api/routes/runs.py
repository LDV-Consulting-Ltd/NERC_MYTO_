import json
import logging
import traceback
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func, text
from pydantic import BaseModel

from app.db import get_db, AsyncSessionLocal
from app.models.bronze import EtlRun, EtlStage, EtlEvent
from app.etl.orchestrator import run_pipeline
from app.api.schemas import envelope

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Runs"])

# Stuck run thresholds
HEARTBEAT_STALE_MINUTES = 10
STARTED_STALE_MINUTES = 30


class RunCreate(BaseModel):
    notes: str | None = None
    source_root_url: str | None = None


async def _mark_run_failed_and_emit(run_id: UUID, message: str, context: dict | None = None):
    """Use a fresh session to mark run failed and emit event (e.g. when background task crashes)."""
    async with AsyncSessionLocal() as session:
        try:
            await session.execute(
                text("UPDATE bronze.etl_run SET finished_at = now(), status = 'failed', heartbeat_at = now() WHERE run_id = :run_id"),
                {"run_id": run_id},
            )
            ctx = context or {}
            ctx_json = json.dumps(ctx)
            await session.execute(
                text(
                    "INSERT INTO bronze.etl_event (run_id, stage_name, level, message, context) "
                    "VALUES (:run_id, 'orchestrator', 'error', :message, CAST(:context AS jsonb))"
                ),
                {"run_id": run_id, "message": message, "context": ctx_json},
            )
            await session.commit()
        except Exception as e:
            await session.rollback()
            logger.exception("Failed to mark run %s as failed: %s", run_id, e)


async def _create_run_impl(body: RunCreate, background_tasks: BackgroundTasks, force: bool = False):
    async with AsyncSessionLocal() as session:
        if not force:
            r = await session.execute(select(EtlRun).where(EtlRun.status == "running").order_by(desc(EtlRun.started_at)).limit(1))
            existing = r.scalars().first()
            if existing:
                await session.rollback()
                raise HTTPException(
                    status_code=409,
                    detail={
                        "error": "run_in_progress",
                        "run_id": str(existing.run_id),
                        "message": "A run is already running.",
                    },
                )
        try:
            run = EtlRun(status="running", notes=body.notes, source_root_url=body.source_root_url)
            session.add(run)
            await session.flush()
            run_id = run.run_id
            started_at = run.started_at
            await session.commit()
        except HTTPException:
            await session.rollback()
            raise
        except Exception as e:
            await session.rollback()
            logger.exception("Create run failed")
            raise HTTPException(status_code=500, detail=f"Create run failed: {e!s}")
    background_tasks.add_task(_run_pipeline_task, run_id, "full", body.notes, body.source_root_url)
    return envelope(
        {
            "run_id": str(run_id),
            "started_at": started_at.isoformat() if started_at else "",
            "finished_at": None,
            "status": "running",
            "source_root_url": body.source_root_url,
            "notes": body.notes,
        },
        count=1,
    )


@router.post("")
@router.post("/")
async def create_run(
    body: RunCreate,
    background_tasks: BackgroundTasks,
    force: bool = Query(False, description="If true, allow creating a run even when one is already running"),
):
    try:
        return await _create_run_impl(body, background_tasks, force=force)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("POST /v1/runs failed")
        raise HTTPException(status_code=500, detail=f"Internal error: {e!s}")


async def _run_pipeline_task(run_id: UUID, mode: str, notes: str | None = None, source_root_url: str | None = None):
    from app.db import AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        try:
            await run_pipeline(session, run_id=run_id, mode=mode, notes=notes, source_root_url=source_root_url)
            await session.commit()
        except Exception as e:
            await session.rollback()
            logger.exception("Pipeline task failed for run %s: %s", run_id, e)
            await _mark_run_failed_and_emit(
                run_id,
                str(e),
                {"error_type": type(e).__name__, "traceback": traceback.format_exc()},
            )
            raise


@router.post("/reconcile")
async def reconcile_stuck_runs(db: AsyncSession = Depends(get_db)):
    """Mark runs as failed if they are stuck (running with stale heartbeat or started > 30 min ago)."""
    r = await db.execute(
        text(
            """
            WITH stuck AS (
                SELECT run_id FROM bronze.etl_run
                WHERE status = 'running'
                AND (
                    (heartbeat_at IS NOT NULL AND heartbeat_at < now() - interval '%s minutes')
                    OR (started_at < now() - interval '%s minutes')
                )
            ),
            updated AS (
                UPDATE bronze.etl_run
                SET finished_at = now(), status = 'failed', heartbeat_at = now()
                WHERE run_id IN (SELECT run_id FROM stuck)
                RETURNING run_id
            )
            SELECT run_id FROM updated
            """
            % (HEARTBEAT_STALE_MINUTES, STARTED_STALE_MINUTES)
        ),
    )
    rows = r.fetchall()
    run_ids = [str(row[0]) for row in rows]
    for run_id in run_ids:
        await db.execute(
            text(
                "INSERT INTO bronze.etl_event (run_id, stage_name, level, message, context) "
                "VALUES (:run_id, 'orchestrator', 'info', 'stuck_run_failed', '{}')"
            ),
            {"run_id": run_id},
        )
    await db.commit()
    return envelope({"reconciled": run_ids, "count": len(run_ids)}, count=len(run_ids))


@router.get("")
async def list_runs(db: AsyncSession = Depends(get_db), limit: int = 50, offset: int = 0):
    r = await db.execute(select(EtlRun).order_by(desc(EtlRun.started_at)).limit(limit).offset(offset))
    runs = r.scalars().all()
    count_r = await db.execute(select(func.count()).select_from(EtlRun))
    count = count_r.scalars().first() or 0
    data = [
        {
            "run_id": str(x.run_id),
            "started_at": x.started_at.isoformat() if x.started_at else "",
            "finished_at": x.finished_at.isoformat() if x.finished_at else None,
            "status": x.status,
            "source_root_url": x.source_root_url,
            "notes": x.notes,
            "heartbeat_at": x.heartbeat_at.isoformat() if getattr(x, "heartbeat_at", None) else None,
        }
        for x in runs
    ]
    next_cursor = str(offset + limit) if offset + limit < count else None
    return envelope(data, count=count, limit=limit, offset=offset, next_cursor=next_cursor)


@router.get("/{run_id}")
async def get_run(run_id: UUID, db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(EtlRun).where(EtlRun.run_id == run_id))
    run = r.scalars().first()
    if not run:
        raise HTTPException(404, "Run not found")
    stages_r = await db.execute(select(EtlStage).where(EtlStage.run_id == run_id).order_by(EtlStage.stage_name))
    stages = stages_r.scalars().all()
    data = {
        "run_id": str(run.run_id),
        "started_at": run.started_at.isoformat() if run.started_at else "",
        "finished_at": run.finished_at.isoformat() if run.finished_at else None,
        "status": run.status,
        "source_root_url": run.source_root_url,
        "notes": run.notes,
        "heartbeat_at": run.heartbeat_at.isoformat() if getattr(run, "heartbeat_at", None) else None,
        "stages": [
            {
                "stage_name": s.stage_name,
                "started_at": s.started_at.isoformat() if s.started_at else None,
                "finished_at": s.finished_at.isoformat() if s.finished_at else None,
                "status": s.status,
                "input_count": s.input_count,
                "output_count": s.output_count,
                "error_count": s.error_count,
                "duration_ms": s.duration_ms,
                "meta": s.meta,
            }
            for s in stages
        ],
    }
    return envelope(data, count=1)


@router.get("/{run_id}/stages")
async def get_run_stages(run_id: UUID, db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(EtlRun).where(EtlRun.run_id == run_id))
    if not r.scalars().first():
        raise HTTPException(404, "Run not found")
    r = await db.execute(select(EtlStage).where(EtlStage.run_id == run_id).order_by(EtlStage.stage_name))
    stages = r.scalars().all()
    data = [
        {
            "stage_name": s.stage_name,
            "status": s.status,
            "started_at": s.started_at.isoformat() if s.started_at else None,
            "finished_at": s.finished_at.isoformat() if s.finished_at else None,
            "output_count": s.output_count,
            "duration_ms": s.duration_ms,
            "meta": s.meta,
        }
        for s in stages
    ]
    return envelope(data, count=len(data))


@router.get("/{run_id}/events")
async def get_run_events(run_id: UUID, db: AsyncSession = Depends(get_db), limit: int = 500, offset: int = 0):
    r = await db.execute(select(EtlRun).where(EtlRun.run_id == run_id))
    if not r.scalars().first():
        raise HTTPException(404, "Run not found")
    r = await db.execute(
        select(EtlEvent).where(EtlEvent.run_id == run_id).order_by(EtlEvent.event_ts.desc()).limit(limit).offset(offset)
    )
    events = r.scalars().all()
    data = [
        {
            "stage_name": e.stage_name,
            "event_ts": e.event_ts.isoformat() if e.event_ts else None,
            "level": e.level,
            "message": e.message,
            "context": e.context,
        }
        for e in events
    ]
    return envelope(data, count=len(data), limit=limit, offset=offset)


@router.get("/{run_id}/snapshot")
async def get_run_snapshot(
    run_id: UUID,
    db: AsyncSession = Depends(get_db),
    pdfs_limit: int = 20,
    table_samples: int = 5,
    silver_sample_rows: int = 5,
):
    """Tables downloaded and data snapshot for this run: PDFs, artifacts count, extracted tables with sample rows, silver commitments sample."""
    r = await db.execute(select(EtlRun).where(EtlRun.run_id == run_id))
    if not r.scalars().first():
        raise HTTPException(404, "Run not found")

    rid = str(run_id)
    # PDFs discovered for this run
    r = await db.execute(
        text(
            "SELECT pdf_url, title, disco_code, month_name, year, pdf_filename FROM bronze.pdf_registry "
            "WHERE run_id = :rid ORDER BY discovered_at DESC LIMIT :lim"
        ),
        {"rid": rid, "lim": pdfs_limit},
    )
    pdfs = [
        {
            "pdf_url": row[0],
            "title": row[1],
            "disco_code": row[2],
            "month_name": row[3],
            "year": row[4],
            "pdf_filename": row[5],
        }
        for row in r.all()
    ]

    # Artifacts count
    r = await db.execute(text("SELECT count(*) FROM bronze.pdf_artifact WHERE run_id = :rid"), {"rid": rid})
    artifacts_count = r.scalar() or 0

    # Extracted tables with sample rows (first N tables, first 3 rows each)
    r = await db.execute(
        text(
            "SELECT pdf_url, page_no, table_index, table_name, method, rows_jsonb FROM bronze.pdf_table_raw "
            "WHERE run_id = :rid ORDER BY extracted_at DESC LIMIT :lim"
        ),
        {"rid": rid, "lim": table_samples},
    )
    raw_tables = r.all()
    table_list = []
    for row in raw_tables:
        pdf_url, page_no, table_index, table_name, method, rows_jsonb = row
        rows = list(rows_jsonb)[:3] if isinstance(rows_jsonb, list) else []
        table_list.append({
            "pdf_url": pdf_url,
            "page_no": page_no,
            "table_index": table_index,
            "table_name": table_name or f"page_{page_no}_table_{table_index}",
            "method": method,
            "row_count": len(rows_jsonb) if isinstance(rows_jsonb, list) else 0,
            "sample_rows": rows,
        })

    r = await db.execute(text("SELECT count(*) FROM bronze.pdf_table_raw WHERE run_id = :rid"), {"rid": rid})
    tables_count = r.scalar() or 0

    # Silver commitments sample
    r = await db.execute(
        text(
            "SELECT disco_code, month_name, year, band, feeder_name, feeder_location, major_users, min_supply_hours "
            "FROM silver.service_level_commitments WHERE run_id = :rid ORDER BY disco_code, feeder_name LIMIT :lim"
        ),
        {"rid": rid, "lim": silver_sample_rows},
    )
    silver_rows = r.all()
    silver_sample = [
        {
            "disco_code": row[0],
            "month_name": row[1],
            "year": row[2],
            "band": row[3],
            "feeder_name": row[4],
            "feeder_location": row[5],
            "major_users": row[6],
            "min_supply_hours": float(row[7]) if row[7] is not None else None,
        }
        for row in silver_rows
    ]

    r = await db.execute(text("SELECT count(*) FROM silver.service_level_commitments WHERE run_id = :rid"), {"rid": rid})
    silver_count = r.scalar() or 0

    # Gold facts for this run
    r = await db.execute(text("SELECT count(*) FROM gold.fact_supply_commitment WHERE run_id = :rid"), {"rid": rid})
    gold_facts_count = r.scalar() or 0

    r = await db.execute(
        text(
            "SELECT f.run_id, f.date_key, d.disco_code, fd.feeder_name, fd.band, f.min_supply_hours, f.source_pdf_url "
            "FROM gold.fact_supply_commitment f "
            "JOIN gold.dim_disco d ON d.disco_key = f.disco_key "
            "JOIN gold.dim_feeder fd ON fd.feeder_key = f.feeder_key "
            "WHERE f.run_id = :rid ORDER BY f.date_key DESC, d.disco_code LIMIT :lim"
        ),
        {"rid": rid, "lim": silver_sample_rows},
    )
    gold_rows = r.all()
    gold_sample = [
        {
            "run_id": str(row[0]),
            "date_key": row[1],
            "disco_code": row[2],
            "feeder_name": row[3],
            "band": row[4],
            "min_supply_hours": float(row[5]) if row[5] is not None else None,
            "source_pdf_url": row[6],
        }
        for row in gold_rows
    ]

    return envelope(
        {
            "run_id": rid,
            "pdfs": pdfs,
            "artifacts_count": artifacts_count,
            "tables_count": tables_count,
            "table_samples": table_list,
            "silver_commitments_count": silver_count,
            "silver_sample": silver_sample,
            "gold_facts_count": gold_facts_count,
            "gold_sample": gold_sample,
        },
        count=1,
    )


@router.post("/{run_id}/execute")
async def execute_run(
    run_id: UUID,
    background_tasks: BackgroundTasks,
    mode: str = "full",
    db: AsyncSession = Depends(get_db),
):
    """Start pipeline in background. mode=full|discover|download|extract|silver|gold|promote. Poll GET /v1/runs/<id>/stages and /events for progress."""
    r = await db.execute(select(EtlRun).where(EtlRun.run_id == run_id))
    if not r.scalars().first():
        raise HTTPException(404, "Run not found")
    background_tasks.add_task(_run_pipeline_task, run_id, mode, None, None)
    return envelope(
        {"run_id": str(run_id), "mode": mode, "status": "started", "message": "Pipeline running in background. Poll GET /v1/runs/{run_id}/stages and /events."},
        count=1,
    )


@router.post("/{run_id}/cancel")
async def cancel_run(run_id: UUID, db: AsyncSession = Depends(get_db)):
    """Mark run as failed and emit cancelled_by_user event. Best-effort; running stages may complete current work."""
    r = await db.execute(select(EtlRun).where(EtlRun.run_id == run_id))
    run = r.scalars().first()
    if not run:
        raise HTTPException(404, "Run not found")
    if run.status != "running":
        return envelope({"run_id": str(run_id), "status": run.status, "message": "Run is not running."}, count=1)
    await db.execute(
        text("UPDATE bronze.etl_run SET finished_at = now(), status = 'failed', heartbeat_at = now() WHERE run_id = :run_id"),
        {"run_id": run_id},
    )
    ctx_json = json.dumps({"cancelled": True})
    await db.execute(
        text(
            "INSERT INTO bronze.etl_event (run_id, stage_name, level, message, context) "
            "VALUES (:run_id, 'orchestrator', 'info', 'cancelled_by_user', CAST(:ctx AS jsonb))"
        ),
        {"run_id": run_id, "ctx": ctx_json},
    )
    await db.commit()
    return envelope({"run_id": str(run_id), "status": "failed", "message": "Run cancelled."}, count=1)


@router.post("/{run_id}/discover")
async def run_discover_only(run_id: UUID, db: AsyncSession = Depends(get_db)):
    """Run only the discover stage (synchronous). After return, query bronze.pdf_registry for this run_id to verify."""
    r = await db.execute(select(EtlRun).where(EtlRun.run_id == run_id))
    if not r.scalars().first():
        raise HTTPException(404, "Run not found")
    try:
        await run_pipeline(db, run_id=run_id, mode="discover")
        await db.commit()
        return envelope({"run_id": str(run_id), "stage": "discover", "status": "completed"}, count=1)
    except Exception as e:
        await db.rollback()
        raise HTTPException(500, str(e))
