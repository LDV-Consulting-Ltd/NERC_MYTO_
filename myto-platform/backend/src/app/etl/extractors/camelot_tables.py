"""
Camelot fallback for table extraction when PyMuPDF fails or returns empty.

Camelot only works on text-based PDF pages. For "image-based" pages (scanned docs or
tables embedded as images) it emits UserWarnings and returns no tables; we treat that
as expected and suppress those warnings to avoid log noise.
"""
from __future__ import annotations
import io
import warnings
from typing import Any

try:
    import camelot
except ImportError:
    camelot = None


def extract_tables_camelot(
    data: bytes,
    pdf_url: str,
    disco_code: str | None,
    month_name: str | None,
    year: int | None,
    pages: list[int] | None = None,
) -> list[dict[str, Any]]:
    """Extract tables via Camelot. pages: 1-based page numbers; if None, all pages."""
    if camelot is None:
        return []
    pages_str = ",".join(str(p) for p in pages) if pages else "all"
    out = []
    try:
        with warnings.catch_warnings():
            warnings.filterwarnings(
                "ignore",
                message=".*image-based.*|.*No tables found.*",
                category=UserWarning,
            )
            tables = camelot.read_pdf(io.BytesIO(data), pages=pages_str, flavor="lattice")
            if not tables:
                tables = camelot.read_pdf(io.BytesIO(data), pages=pages_str, flavor="stream")
        for t in tables:
            try:
                df = t.df
                if df is None or df.empty:
                    continue
                rows = df.to_dict(orient="records")
                rows_serializable = []
                for r in rows:
                    row = {str(k): (None if (v is None or (isinstance(v, float) and str(v) == "nan")) else v) for k, v in r.items()}
                    rows_serializable.append(row)
                out.append({
                    "page_no": t.page,
                    "table_index": t.order,
                    "table_name": f"page_{t.page}_table_{t.order}",
                    "method": "camelot",
                    "confidence": 0.7,
                    "rows_jsonb": rows_serializable,
                    "pdf_url": pdf_url,
                    "disco_code": disco_code,
                    "month_name": month_name,
                    "year": year,
                })
            except Exception:
                continue
    except Exception:
        pass
    return out
