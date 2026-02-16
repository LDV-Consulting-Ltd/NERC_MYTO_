"""
Download stage: fetch PDFs from bronze.pdf_registry (status=resolved), store in bronze.pdf_artifact.
One shared AsyncClient; configurable concurrency (default 12); stream + sha256; incremental persist.
"""
import asyncio
import hashlib
import json
import time
from uuid import UUID
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from app.config import get_settings
from app.models.bronze import PdfRegistry, PdfArtifact


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=15))
async def _download_one(
    client: httpx.AsyncClient,
    url: str,
) -> tuple[int, str, bytes | None, str | None]:
    try:
        r = await client.get(url, follow_redirects=True, timeout=60.0)
        ct = r.headers.get("content-type") or ""
        if r.status_code != 200:
            return r.status_code, ct, None, r.text[:500] if r.text else None
        return r.status_code, ct, r.content, None
    except Exception as e:
        return 0, "", None, str(e)


async def _download_one_streaming(
    client: httpx.AsyncClient,
    url: str,
) -> tuple[int, str, bytes | None, str | None]:
    """Stream response and compute sha256 on the fly."""
    try:
        async with client.stream("GET", url, follow_redirects=True, timeout=60.0) as r:
            ct = r.headers.get("content-type") or ""
            if r.status_code != 200:
                body = await r.aread()
                return r.status_code, ct, None, body[:500].decode("utf-8", errors="replace") if body else None
            hasher = hashlib.sha256()
            chunks = []
            async for chunk in r.aiter_bytes():
                hasher.update(chunk)
                chunks.append(chunk)
            body = b"".join(chunks)
            return r.status_code, ct, body, None
    except Exception as e:
        return 0, "", None, str(e)


async def download_pdfs(
    session: AsyncSession,
    run_id: UUID,
    concurrency: int | None = None,
) -> tuple[int, int]:
    """
    Load pdf_registry for run_id where status='resolved' and pdf_url_resolved IS NOT NULL.
    One shared AsyncClient. Concurrency from config (default 12).
    Stream download, sha256 on the fly; persist per PDF (immediate); etl_event per PDF.
    Skip if artifact already exists for this run with same sha256 (unchanged).
    Returns (success_count, error_count).
    """
    settings = get_settings()
    concurrency = concurrency if concurrency is not None else settings.download_concurrency

    result = await session.execute(
        select(
            PdfRegistry.pdf_url,
            PdfRegistry.pdf_url_resolved,
            PdfRegistry.pdf_filename,
        ).where(
            PdfRegistry.run_id == run_id,
            PdfRegistry.status == "resolved",
            PdfRegistry.pdf_url_resolved.isnot(None),
        )
    )
    rows = result.all()
    success = 0
    error_count = 0
    sem = asyncio.Semaphore(concurrency)

    existing_sha = set()
    r_sha = await session.execute(
        text("SELECT sha256 FROM bronze.pdf_artifact WHERE run_id = :run_id AND sha256 IS NOT NULL"),
        {"run_id": run_id},
    )
    for (s,) in r_sha.all():
        if s:
            existing_sha.add(s)

    session_lock = asyncio.Lock()

    async with httpx.AsyncClient(
        headers={"User-Agent": "MYTO-Platform/1.0"},
        follow_redirects=True,
    ) as client:

        async def do_one(pdf_url_original: str, pdf_url_resolved: str, pdf_filename: str | None) -> None:
            nonlocal success, error_count
            async with sem:
                t0 = time.perf_counter()
                status, content_type, body, err = await _download_one_streaming(client, pdf_url_resolved)
                duration_ms = int((time.perf_counter() - t0) * 1000)
                sha = hashlib.sha256(body).hexdigest() if body else None
                async with session_lock:
                    if sha and sha in existing_sha:
                        await session.execute(
                            text("UPDATE bronze.pdf_registry SET status = 'unchanged' WHERE run_id = :run_id AND pdf_url = :pdf_url"),
                            {"run_id": run_id, "pdf_url": pdf_url_original},
                        )
                        await session.flush()
                        return
                    existing_art = await session.execute(
                        select(PdfArtifact.run_id).where(
                            PdfArtifact.run_id == run_id,
                            PdfArtifact.pdf_url == pdf_url_resolved,
                        ).limit(1)
                    )
                    if existing_art.scalar():
                        await session.execute(
                            text("UPDATE bronze.pdf_registry SET status = 'downloaded' WHERE run_id = :run_id AND pdf_url = :pdf_url"),
                            {"run_id": run_id, "pdf_url": pdf_url_original},
                        )
                        await session.flush()
                        return
                    art = PdfArtifact(
                        run_id=run_id,
                        pdf_url=pdf_url_resolved,
                        sha256=sha,
                        file_bytes=body,
                        http_status=status,
                        content_type=content_type or None,
                        error=err,
                    )
                    session.add(art)
                    bytes_count = len(body) if body else 0
                    await session.execute(
                        text("""
                            UPDATE bronze.pdf_registry
                            SET status = 'downloaded', downloaded_at = now(), bytes_count = :bytes_count
                            WHERE run_id = :run_id AND pdf_url = :pdf_url
                        """),
                        {"run_id": run_id, "pdf_url": pdf_url_original, "bytes_count": bytes_count},
                    )
                    await session.flush()
                    await session.execute(
                        text(
                            "INSERT INTO bronze.etl_event (run_id, stage_name, level, message, context) "
                            "VALUES (:run_id, 'download', 'info', :msg, CAST(:ctx AS jsonb))"
                        ),
                        {
                            "run_id": run_id,
                            "msg": "pdf_done",
                            "ctx": json.dumps({
                                "pdf_url_resolved": pdf_url_resolved,
                                "filename": pdf_filename,
                                "download_ms": duration_ms,
                                "bytes": bytes_count,
                                "sha256": sha[:16] + "..." if sha else None,
                                "status": "ok" if status == 200 else "fail",
                            }),
                        },
                    )
                    await session.flush()
                    if status == 200 and body:
                        success += 1
                        if sha:
                            existing_sha.add(sha)
                    else:
                        error_count += 1

        await asyncio.gather(*[
            do_one(r.pdf_url, r.pdf_url_resolved or r.pdf_url, getattr(r, "pdf_filename", None))
            for r in rows
        ])

    return success, error_count


async def download_for_entries(
    session: AsyncSession,
    run_id: UUID,
    entries: list[dict],
) -> tuple[int, int]:
    """
    Download only the PDFs for the given discovered entries (same run_id, pdf_url in entries).
    Uses same one client, concurrency, streaming, incremental persist.
    """
    urls_original = {e.get("pdf_url") for e in entries if e.get("pdf_url")}
    if not urls_original:
        return 0, 0
    result = await session.execute(
        select(
            PdfRegistry.pdf_url,
            PdfRegistry.pdf_url_resolved,
            PdfRegistry.pdf_filename,
        ).where(
            PdfRegistry.run_id == run_id,
            PdfRegistry.pdf_url.in_(urls_original),
            PdfRegistry.status == "resolved",
            PdfRegistry.pdf_url_resolved.isnot(None),
        )
    )
    rows = result.all()
    if not rows:
        return 0, 0
    success = 0
    error_count = 0
    settings = get_settings()
    concurrency = settings.download_concurrency
    sem = asyncio.Semaphore(concurrency)
    existing_sha = set()
    r_sha = await session.execute(
        text("SELECT sha256 FROM bronze.pdf_artifact WHERE run_id = :run_id AND sha256 IS NOT NULL"),
        {"run_id": run_id},
    )
    for (s,) in r_sha.all():
        if s:
            existing_sha.add(s)

    session_lock = asyncio.Lock()

    async with httpx.AsyncClient(
        headers={"User-Agent": "MYTO-Platform/1.0"},
        follow_redirects=True,
    ) as client:

        async def do_one(pdf_url_original: str, pdf_url_resolved: str, pdf_filename: str | None) -> None:
            nonlocal success, error_count
            async with sem:
                t0 = time.perf_counter()
                status, content_type, body, err = await _download_one_streaming(client, pdf_url_resolved)
                duration_ms = int((time.perf_counter() - t0) * 1000)
                sha = hashlib.sha256(body).hexdigest() if body else None
                async with session_lock:
                    if sha and sha in existing_sha:
                        await session.execute(
                            text("UPDATE bronze.pdf_registry SET status = 'unchanged' WHERE run_id = :run_id AND pdf_url = :pdf_url"),
                            {"run_id": run_id, "pdf_url": pdf_url_original},
                        )
                        await session.flush()
                        return
                    existing_art = await session.execute(
                        select(PdfArtifact.run_id).where(
                            PdfArtifact.run_id == run_id,
                            PdfArtifact.pdf_url == pdf_url_resolved,
                        ).limit(1)
                    )
                    if existing_art.scalar():
                        await session.execute(
                            text("UPDATE bronze.pdf_registry SET status = 'downloaded' WHERE run_id = :run_id AND pdf_url = :pdf_url"),
                            {"run_id": run_id, "pdf_url": pdf_url_original},
                        )
                        await session.flush()
                        return
                    art = PdfArtifact(
                        run_id=run_id,
                        pdf_url=pdf_url_resolved,
                        sha256=sha,
                        file_bytes=body,
                        http_status=status,
                        content_type=content_type or None,
                        error=err,
                    )
                    session.add(art)
                    bytes_count = len(body) if body else 0
                    await session.execute(
                        text("""
                            UPDATE bronze.pdf_registry
                            SET status = 'downloaded', downloaded_at = now(), bytes_count = :bytes_count
                            WHERE run_id = :run_id AND pdf_url = :pdf_url
                        """),
                        {"run_id": run_id, "pdf_url": pdf_url_original, "bytes_count": bytes_count},
                    )
                    await session.flush()
                    await session.execute(
                        text(
                            "INSERT INTO bronze.etl_event (run_id, stage_name, level, message, context) "
                            "VALUES (:run_id, 'download', 'info', :msg, CAST(:ctx AS jsonb))"
                        ),
                        {
                            "run_id": run_id,
                            "msg": "pdf_done",
                            "ctx": json.dumps({
                                "pdf_url_resolved": pdf_url_resolved,
                                "filename": pdf_filename,
                                "download_ms": duration_ms,
                                "bytes": bytes_count,
                                "sha256": sha[:16] + "..." if sha else None,
                                "status": "ok" if status == 200 else "fail",
                            }),
                        },
                    )
                    await session.flush()
                    if status == 200 and body:
                        success += 1
                        if sha:
                            existing_sha.add(sha)
                    else:
                        error_count += 1

        await asyncio.gather(*[
            do_one(r.pdf_url, r.pdf_url_resolved or r.pdf_url, getattr(r, "pdf_filename", None))
            for r in rows
        ])

    return success, error_count
