"""
Resolve stage: open each discovered link (HEAD or GET) to get final URL and filename.
Batch resolve in chunks; persist each chunk immediately. One shared httpx.AsyncClient.
"""
import asyncio
import re
from uuid import UUID
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.config import get_settings
from app.models.bronze import PdfRegistry


def _filename_from_content_disposition(h: str) -> str | None:
    m = re.search(r'filename\s*=\s*(?:"([^"]+)"|([^;\s]+))', h, re.I)
    if m:
        return m.group(1) or m.group(2)
    return None


def _filename_from_url(url: str) -> str:
    path = url.split("?")[0].rstrip("/")
    return path.split("/")[-1] or "document.pdf"


async def _resolve_one(
    client: httpx.AsyncClient,
    pdf_url_original: str,
    candidate: str,
) -> tuple[str, str | None, str | None, str | None, str]:
    """Resolve via HEAD (follow_redirects=True); if HEAD blocked (e.g. 405), GET with stream and close after headers."""
    try:
        r = await client.head(candidate, follow_redirects=True, timeout=15.0)
        if r.status_code in (405, 403, 401):
            async with client.stream("GET", candidate, follow_redirects=True, timeout=15.0) as stream:
                await stream.aread()
                r = stream
        if r.status_code != 200:
            return pdf_url_original, None, None, None, "resolve_failed"
        final_url = str(r.url)
        ct = r.headers.get("content-type") or ""
        if "pdf" not in ct.lower() and ".pdf" not in final_url.lower():
            return pdf_url_original, final_url, None, ct, "skipped_non_pdf"
        cd = r.headers.get("content-disposition") or ""
        filename = _filename_from_content_disposition(cd) or _filename_from_url(final_url)
        return pdf_url_original, final_url, filename, ct, "resolved"
    except Exception:
        return pdf_url_original, None, None, None, "resolve_failed"


async def resolve_for_entries(
    session: AsyncSession,
    run_id: UUID,
    entries: list[dict],
) -> tuple[int, int]:
    """
    For each discovered entry (with pdf_url, view_url, download_url), resolve the link
    (HEAD follow redirects), capture final URL and Content-Disposition filename.
    Update bronze.pdf_registry: pdf_url_resolved, pdf_filename, content_type, resolved_at, status.
    Batch in chunks (config resolve_chunk_size); resolve chunk concurrently, persist each chunk immediately.
    Returns (resolved_count, failed_count).
    """
    settings = get_settings()
    chunk_size = settings.resolve_chunk_size
    resolved = 0
    failed = 0

    async with httpx.AsyncClient(
        headers={"User-Agent": "MYTO-Platform/1.0 (ETL resolve)"},
        follow_redirects=True,
        timeout=15.0,
    ) as client:
        for i in range(0, len(entries), chunk_size):
            chunk = entries[i : i + chunk_size]
            async def fail(po: str):
                return (po, None, None, None, "resolve_failed")

            tasks = []
            for row in chunk:
                pdf_url_original = row.get("pdf_url")
                view_url = row.get("view_url")
                download_url = row.get("download_url")
                candidate = download_url or view_url or pdf_url_original
                if not candidate:
                    tasks.append(fail(pdf_url_original))
                else:
                    tasks.append(_resolve_one(client, pdf_url_original, candidate))
            updates = await asyncio.gather(*tasks)
            for pdf_url_original, pdf_url_resolved, pdf_filename, content_type, status in updates:
                if status == "resolved":
                    resolved += 1
                else:
                    failed += 1
                await session.execute(
                    text("""
                        UPDATE bronze.pdf_registry
                        SET pdf_url_resolved = :resolved, pdf_filename = :filename, content_type = :ct,
                            resolved_at = now(), status = :status
                        WHERE run_id = :run_id AND pdf_url = :pdf_url
                    """),
                    {
                        "run_id": run_id,
                        "pdf_url": pdf_url_original,
                        "resolved": pdf_url_resolved,
                        "filename": pdf_filename,
                        "ct": content_type,
                        "status": status,
                    },
                )
            await session.flush()
    return resolved, failed
