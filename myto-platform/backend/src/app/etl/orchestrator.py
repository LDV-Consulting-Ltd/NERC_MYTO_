"""
Orchestrator: one continuous automated pipeline. No break between Bronze, Silver, Gold.
Stages run sequentially in a single loop: when Bronze (discover → download → extract) finishes,
Silver (silver_transform → silver_geocode) starts automatically; when Silver finishes, Gold
(gold_build → promote_latest) starts. One run_id, one transaction flow.
"""
import json
import time
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.config import get_settings
from app.models.bronze import EtlRun, EtlStage, EtlEvent
# Stage modules (selectolax / pymupdf / camelot) load lazily so Vercel cold start
# can import app.main without pulling ETL parsers into every request.


STAGES_FULL = [
    "discover",
    "download",
    "extract",
    "silver_transform",
    "silver_geocode",
    "gold_build",
    "promote_latest",
]


async def _emit_event(session: AsyncSession, run_id: UUID, stage_name: str, level: str, message: str, context: dict | None = None):
    context_json = json.dumps(context) if context is not None else "{}"
    await session.execute(
        text(
            "INSERT INTO bronze.etl_event (run_id, stage_name, level, message, context) "
            "VALUES (:run_id, :stage_name, :level, :message, CAST(:context AS jsonb))"
        ),
        {"run_id": run_id, "stage_name": stage_name, "level": level, "message": message, "context": context_json},
    )
    await session.flush()


async def _stage_start(session: AsyncSession, run_id: UUID, stage_name: str):
    await session.execute(
        text(
            "INSERT INTO bronze.etl_stage (run_id, stage_name, status) VALUES (:run_id, :stage_name, 'running') "
            "ON CONFLICT (run_id, stage_name) DO UPDATE SET started_at = now(), status = 'running', finished_at = NULL"
        ),
        {"run_id": run_id, "stage_name": stage_name},
    )
    await session.flush()
    await _heartbeat(session, run_id)


async def _stage_finish(session: AsyncSession, run_id: UUID, stage_name: str, status: str, input_count: int | None = None, output_count: int | None = None, error_count: int | None = None, duration_ms: int | None = None, meta: dict | None = None):
    meta_json = json.dumps(meta) if meta is not None else None
    await session.execute(
        text(
            "UPDATE bronze.etl_stage SET finished_at = now(), status = :status, input_count = :input_count, "
            "output_count = :output_count, error_count = :error_count, duration_ms = :duration_ms, meta = CAST(:meta AS jsonb) "
            "WHERE run_id = :run_id AND stage_name = :stage_name"
        ),
        {
            "run_id": run_id,
            "stage_name": stage_name,
            "status": status,
            "input_count": input_count,
            "output_count": output_count,
            "error_count": error_count,
            "duration_ms": duration_ms,
            "meta": meta_json,
        },
    )
    await session.flush()


async def _run_finish(session: AsyncSession, run_id: UUID, status: str):
    await session.execute(
        text("UPDATE bronze.etl_run SET finished_at = now(), status = :status, heartbeat_at = now() WHERE run_id = :run_id"),
        {"run_id": run_id, "status": status},
    )
    await session.flush()


async def _heartbeat(session: AsyncSession, run_id: UUID):
    await session.execute(
        text("UPDATE bronze.etl_run SET heartbeat_at = now() WHERE run_id = :run_id"),
        {"run_id": run_id},
    )
    await session.flush()


async def run_pipeline(
    session: AsyncSession,
    run_id: UUID | None = None,
    mode: str = "full",
    source_root_url: str | None = None,
    notes: str | None = None,
) -> UUID:
    settings = get_settings()
    if run_id is None:
        run = EtlRun(status="running", source_root_url=source_root_url or settings.myto_list_base_url, notes=notes)
        session.add(run)
        await session.flush()
        run_id = run.run_id
    else:
        await session.execute(
            text("UPDATE bronze.etl_run SET status = 'running', finished_at = NULL, heartbeat_at = now() WHERE run_id = :run_id"),
            {"run_id": run_id},
        )
        await session.flush()

    stages = STAGES_FULL if mode == "full" else [s for s in STAGES_FULL if s == mode or (mode == "silver" and s in ("silver_transform", "silver_geocode")) or (mode == "gold" and s == "gold_build") or (mode == "promote" and s == "promote_latest")]
    if not stages and mode != "full":
        stages = [mode]

    try:
        for stage_name in stages:
            t0 = time.perf_counter()
            await _stage_start(session, run_id, stage_name)
            try:
                if stage_name == "discover":
                    from app.etl.stages import discover as stage_discover
                    from app.etl.stages import resolve as stage_resolve
                    from app.etl.stages import download as stage_download

                    async def on_page_done(sess, rid, page_entries):
                        await stage_resolve.resolve_for_entries(sess, rid, page_entries)
                        await stage_download.download_for_entries(sess, rid, page_entries)
                    out = await stage_discover.discover_myto_pdfs(session, run_id, on_page_done=on_page_done)
                    await _stage_finish(session, run_id, stage_name, "success", output_count=out, duration_ms=int((time.perf_counter() - t0) * 1000), meta={"pdf_count": out})
                elif stage_name == "download":
                    from app.etl.stages import download as stage_download

                    succ, err = await stage_download.download_pdfs(session, run_id)
                    await _stage_finish(session, run_id, stage_name, "success", output_count=succ, error_count=err, duration_ms=int((time.perf_counter() - t0) * 1000))
                elif stage_name == "extract":
                    from app.etl.stages import extract as stage_extract

                    tables, _ = await stage_extract.extract_tables(session, run_id)
                    await _stage_finish(session, run_id, stage_name, "success", output_count=tables, duration_ms=int((time.perf_counter() - t0) * 1000))
                elif stage_name == "silver_transform":
                    from app.etl.stages import silver_transform as stage_silver_transform

                    count = await stage_silver_transform.silver_transform(session, run_id)
                    await _stage_finish(session, run_id, stage_name, "success", output_count=count, duration_ms=int((time.perf_counter() - t0) * 1000))
                elif stage_name == "silver_geocode":
                    from app.etl.stages import silver_geocode as stage_silver_geocode

                    count = await stage_silver_geocode.silver_geocode(session, run_id)
                    await _stage_finish(session, run_id, stage_name, "success", output_count=count, duration_ms=int((time.perf_counter() - t0) * 1000))
                elif stage_name == "gold_build":
                    from app.etl.stages import gold_build as stage_gold_build

                    count = await stage_gold_build.gold_build(session, run_id)
                    await _stage_finish(session, run_id, stage_name, "success", output_count=count, duration_ms=int((time.perf_counter() - t0) * 1000))
                elif stage_name == "promote_latest":
                    from app.etl.stages import promote_latest as stage_promote_latest

                    await stage_promote_latest.promote_latest(session, run_id)
                    await _stage_finish(session, run_id, stage_name, "success", duration_ms=int((time.perf_counter() - t0) * 1000))
            except Exception as e:
                await session.rollback()
                await _stage_finish(session, run_id, stage_name, "failed", duration_ms=int((time.perf_counter() - t0) * 1000), meta={"error": str(e)})
                await _emit_event(session, run_id, stage_name, "error", str(e), {"error_type": type(e).__name__})
                await _run_finish(session, run_id, "failed")
                raise
        await _run_finish(session, run_id, "success")
    except Exception as e:
        # Top-level failure (e.g. in _stage_start or before stage body): ensure run is never left "running"
        try:
            await _run_finish(session, run_id, "failed")
            await _emit_event(session, run_id, "orchestrator", "error", str(e), {"error_type": type(e).__name__})
        except Exception:
            pass
        raise
    return run_id
