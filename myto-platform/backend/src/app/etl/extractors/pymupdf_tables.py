"""
PyMuPDF (fitz) table extraction. Do NOT rely on Appendix/section titles.
Only run on candidate pages (SLC header signature >= 4); caller passes candidate_pages.
"""
from __future__ import annotations
import io
from typing import Any

import fitz  # pymupdf


def extract_tables_from_pdf_bytes(
    data: bytes,
    pdf_url: str,
    disco_code: str | None,
    month_name: str | None,
    year: int | None,
    candidate_pages: list[int] | None = None,
) -> list[dict[str, Any]]:
    """
    Open PDF with PyMuPDF; for each (candidate) page run find_tables().
    candidate_pages: 1-based page numbers to process; if None, process all pages.
    Return list of {page_no, table_index, table_name, method, confidence, rows_jsonb}.
    """
    doc = fitz.open(stream=data, filetype="pdf")
    out = []
    try:
        n_pages = len(doc)
        pages_to_process = range(1, n_pages + 1)
        if candidate_pages:
            pages_to_process = [p for p in candidate_pages if 1 <= p <= n_pages]
        for page_no in pages_to_process:
            page_index = page_no - 1
            page = doc[page_index]
            tables = page.find_tables()
            if not tables:
                continue
            for idx, table in enumerate(tables):
                try:
                    df = table.extract()
                    if df is None or df.empty:
                        continue
                    rows = df.to_dict(orient="records")
                    rows_serializable = []
                    for r in rows:
                        row = {}
                        for k, v in r.items():
                            if v is None or (isinstance(v, float) and str(v) == "nan"):
                                row[str(k)] = None
                            else:
                                row[str(k)] = v
                        rows_serializable.append(row)
                    out.append({
                        "page_no": page_no,
                        "table_index": idx,
                        "table_name": f"page_{page_no}_table_{idx}",
                        "method": "pymupdf",
                        "confidence": 0.85,
                        "rows_jsonb": rows_serializable,
                        "pdf_url": pdf_url,
                        "disco_code": disco_code,
                        "month_name": month_name,
                        "year": year,
                    })
                except Exception:
                    continue
    finally:
        doc.close()
    return out
