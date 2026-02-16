"""
Extract stage: SLC signature per page (PyMuPDF text), then vector extraction only on candidate pages.
PyMuPDF first, Camelot fallback only if PyMuPDF yields 0. Image-based pages (text < 200) skip vector; route to OCR later.
"""
import json
import time
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from app.models.bronze import PdfArtifact, PdfRegistry, PdfTableRaw
from app.etl.extractors import pymupdf_tables
from app.etl.extractors import camelot_tables
from app.etl.slc_signature import get_signature_per_page, is_image_based_page


async def extract_tables(session: AsyncSession, run_id: UUID) -> tuple[int, int]:
    """
    For each artifact: compute SLC signature per page, persist to pdf_page_signature.
    Only on candidate pages (score >= 4): PyMuPDF first, Camelot fallback if 0 tables.
    Image-based pages (text < 200) with 0 tables are skipped (OCR stage will handle later).
    Returns (tables_written, artifacts_processed).
    """
    result = await session.execute(
        select(PdfArtifact.pdf_url, PdfArtifact.file_bytes, PdfArtifact.sha256).where(
            PdfArtifact.run_id == run_id,
            PdfArtifact.file_bytes.isnot(None),
        )
    )
    artifacts = result.all()
    reg = await session.execute(
        select(
            PdfRegistry.pdf_url,
            PdfRegistry.pdf_url_resolved,
            PdfRegistry.disco_code,
            PdfRegistry.month_name,
            PdfRegistry.year,
        ).where(PdfRegistry.run_id == run_id)
    )
    meta = {}
    for r in reg.all():
        meta[r.pdf_url] = (r.disco_code, r.month_name, r.year)
        if getattr(r, "pdf_url_resolved", None):
            meta[r.pdf_url_resolved] = (r.disco_code, r.month_name, r.year)

    tables_written = 0
    for pdf_url, file_bytes, sha256 in artifacts:
        if not file_bytes:
            continue
        disco_code, month_name, year = meta.get(pdf_url, (None, None, None))

        # 1) Signature per page (PyMuPDF text only)
        signatures = get_signature_per_page(file_bytes)
        candidate_pages = [s["page_no"] for s in signatures if s["is_candidate"]]

        # 2) Persist signature per page
        for s in signatures:
            await session.execute(
                text("""
                    INSERT INTO bronze.pdf_page_signature
                    (run_id, pdf_url, page_no, header_signature_score, matched_tokens, is_candidate)
                    VALUES (:run_id, :pdf_url, :page_no, :score, CAST(:tokens AS jsonb), :is_cand)
                    ON CONFLICT (run_id, pdf_url, page_no) DO UPDATE SET
                    header_signature_score = EXCLUDED.header_signature_score,
                    matched_tokens = EXCLUDED.matched_tokens,
                    is_candidate = EXCLUDED.is_candidate
                """),
                {
                    "run_id": run_id,
                    "pdf_url": pdf_url,
                    "page_no": s["page_no"],
                    "score": s["header_signature_score"],
                    "tokens": json.dumps(s["matched_tokens"]),
                    "is_cand": s["is_candidate"],
                },
            )
        await session.flush()

        # 3) Only on candidate pages: PyMuPDF then Camelot fallback
        for page_no in candidate_pages:
            if is_image_based_page(file_bytes, page_no):
                continue
            t0 = time.perf_counter()
            rows_out = pymupdf_tables.extract_tables_from_pdf_bytes(
                file_bytes, pdf_url, disco_code, month_name, year, candidate_pages=[page_no]
            )
            if not rows_out:
                rows_out = camelot_tables.extract_tables_camelot(
                    file_bytes, pdf_url, disco_code, month_name, year, pages=[page_no]
                )
            duration_ms = int((time.perf_counter() - t0) * 1000)
            sig = next((s for s in signatures if s["page_no"] == page_no), {})
            score = sig.get("header_signature_score")
            matched_tokens = sig.get("matched_tokens") or []

            for t in rows_out:
                raw = PdfTableRaw(
                    run_id=run_id,
                    pdf_url=pdf_url,
                    disco_code=t.get("disco_code"),
                    month_name=t.get("month_name"),
                    year=t.get("year"),
                    page_no=t["page_no"],
                    table_index=t["table_index"],
                    table_name=t.get("table_name"),
                    method=t.get("method"),
                    confidence=t.get("confidence"),
                    rows_jsonb=t["rows_jsonb"],
                    duration_ms=duration_ms,
                    header_signature_score=score,
                    matched_tokens=matched_tokens,
                    extractor_used=t.get("method"),
                )
                session.add(raw)
                tables_written += 1
            if not rows_out:
                pass

        await session.flush()

    return tables_written, len(artifacts)
