"""
Debug/verify endpoints: SLC signature and OCR reconstruction.
"""
import httpx
from fastapi import APIRouter, Query, HTTPException

from app.etl.slc_signature import get_signature_per_page
from app.etl.ocr_engine import page_to_image, run_ocr_on_image, ocr_pdf_page
from app.etl.ocr_reconstruct import reconstruct_table_from_boxes

router = APIRouter(prefix="/debug", tags=["Debug"])


async def _fetch_pdf_bytes(pdf_url: str) -> bytes:
    async with httpx.AsyncClient(follow_redirects=True, timeout=60.0) as client:
        r = await client.get(pdf_url)
        if r.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Failed to fetch PDF: {r.status_code}")
        return r.content


@router.get("/slc-signature")
async def debug_slc_signature(pdf_url: str = Query(..., description="URL of the PDF")):
    """
    Returns per-page: match_count, matched_tokens, is_candidate.
    Fetches PDF via HTTP and runs PyMuPDF text-only signature detection.
    """
    data = await _fetch_pdf_bytes(pdf_url)
    pages = get_signature_per_page(data)
    return {
        "pdf_url": pdf_url,
        "pages": [
            {
                "page_no": p["page_no"],
                "match_count": p["header_signature_score"],
                "matched_tokens": p["matched_tokens"],
                "is_candidate": p["is_candidate"],
            }
            for p in pages
        ],
    }


@router.get("/ocr-reconstruct")
async def debug_ocr_reconstruct(
    pdf_url: str = Query(..., description="URL of the PDF"),
    page_no: int = Query(..., ge=1, description="1-based page number"),
):
    """
    Runs OCR on the given page (or uses cache if implemented with session),
    then reconstructs table: detected header row, column boundaries, reconstructed rows, confidence metrics.
    """
    data = await _fetch_pdf_bytes(pdf_url)
    img = page_to_image(data, page_no)
    if not img:
        raise HTTPException(status_code=400, detail="Page not found or failed to render")
    boxes, engine, duration_ms = run_ocr_on_image(img)
    page_width = 612.0
    page_height = 792.0
    try:
        import fitz
        doc = fitz.open(stream=data, filetype="pdf")
        if 1 <= page_no <= len(doc):
            page = doc[page_no - 1]
            rect = page.rect
            page_width = rect.width
            page_height = rect.height
        doc.close()
    except Exception:
        pass
    rows, metrics = reconstruct_table_from_boxes(boxes, page_width, page_height)
    return {
        "pdf_url": pdf_url,
        "page_no": page_no,
        "ocr_engine": engine,
        "ocr_duration_ms": round(duration_ms, 2),
        "header_row_index": metrics.get("header_row_index"),
        "table_confidence": metrics.get("table_confidence"),
        "dq_flag": metrics.get("dq_flag"),
        "reconstructed_rows": rows,
        "ocr_boxes_count": len(boxes),
    }
