"""
Silver transform: read bronze.pdf_table_raw, parse SLC rows, write silver.service_level_commitments
and silver.service_level_commitments_dq.
"""
import re
from decimal import Decimal
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from app.models.bronze import PdfTableRaw
from app.models.silver import ServiceLevelCommitments, ServiceLevelCommitmentsDq
from app.services.validation import parse_min_supply_hours, dq_status_for_slc_row


def _normalize_cell(v: any) -> str | None:
    if v is None:
        return None
    s = str(v).strip()
    return s if s else None


# SLC table column order when extraction uses numeric keys: 0=S/N, 1=Band, 2=Feeder name, 3=Location/description, 4=Major streets, 5=Min supply
_POSITIONAL_SLC = ("sn", "band", "feeder_name", "feeder_location", "major_users", "min_supply_hours")

# Substrings that indicate a row is a table header, not data (skip to avoid duplicates and bad keys)
_HEADER_INDICATORS = (
    "tariff\nfeeder", "feeder\nband", "feeder name\nlocation", "minimum\nname", "duration of\nsupply",
    "band\nfeeder", "major streets served", "name of major streets",
)


def _is_header_row(rec: dict) -> bool:
    """True if this record looks like a table header row (skip to avoid duplicate key and junk data)."""
    band = (rec.get("band") or "").strip().lower()
    feeder = (rec.get("feeder_name") or "").strip().lower()
    major = (rec.get("major_users") or "").strip().lower()
    combined = "\n".join([band, feeder, major])
    return any(h in combined for h in _HEADER_INDICATORS)


def _row_from_positional(row: dict) -> dict | None:
    """Build SLC record from row with keys '0','1',... or 0,1,..."""
    vals = []
    for i in range(len(_POSITIONAL_SLC)):
        v = row.get(str(i)) or row.get(i)
        vals.append(_normalize_cell(v) if v is not None else None)
    if len(vals) < 6:
        return None
    feeder_name = vals[2] or ""
    feeder_location = vals[3] or ""
    band = vals[1] or ""
    major_users = vals[4]
    hours = parse_min_supply_hours(vals[5]) if vals[5] is not None else None
    if not feeder_name and not feeder_location and not band and hours is None:
        return None
    return {
        "feeder_name": feeder_name,
        "feeder_location": feeder_location,
        "band": band,
        "min_supply_hours": hours,
        "major_users": major_users,
    }


def _infer_slc_rows(rows_jsonb: list[dict]) -> list[dict]:
    """
    Heuristic: find rows that look like SLC (feeder name, location, band, hours).
    Tries named columns first (from table header); falls back to positional columns (0,1,2,3,4,5)
    when extraction uses numeric keys (e.g. PyMuPDF/Camelot with no header row).
    """
    out = []
    for row in rows_jsonb:
        if not isinstance(row, dict):
            continue
        # Check if row uses positional keys (e.g. "0", "1", "2")
        use_positional = any(str(i) in row or i in row for i in range(6))
        if use_positional:
            rec = _row_from_positional(row)
            if rec:
                out.append(rec)
            continue
        vals = {str(k).upper().replace(" ", "_"): v for k, v in row.items()}
        feeder_name = _normalize_cell(
            vals.get("FEEDER") or vals.get("FEEDER_NAME") or vals.get("FEEDER_NAME/NO") or next((v for k, v in row.items() if "feeder" in str(k).lower()), None)
        )
        location = _normalize_cell(
            vals.get("LOCATION") or vals.get("FEEDER_LOCATION") or vals.get("LOCATION/S") or vals.get("DESCRIPTION_OF_FEEDER_LOCATION") or next((v for k, v in row.items() if "location" in str(k).lower() or "description" in str(k).lower()), None)
        )
        band = _normalize_cell(
            vals.get("BAND") or vals.get("BAND/S") or next((v for k, v in row.items() if "band" in str(k).lower()), None)
        )
        hours = None
        for key in ("MIN_SUPPLY_HOURS", "HOURS", "SUPPLY_HOURS", "MIN_HOURS", "MIN_SUPPLY_DURATION"):
            if key in vals:
                hours = parse_min_supply_hours(vals[key])
                break
        if hours is None:
            for k, v in row.items():
                if "hour" in str(k).lower() or "supply" in str(k).lower() or "duration" in str(k).lower():
                    hours = parse_min_supply_hours(v)
                    break
        major_users = _normalize_cell(
            vals.get("MAJOR_USERS") or vals.get("NAME_OF_MAJOR_STREETS") or next((v for k, v in row.items() if "user" in str(k).lower() or "street" in str(k).lower()), None)
        )
        if feeder_name or location or band or hours is not None:
            out.append({
                "feeder_name": feeder_name or "",
                "feeder_location": location or "",
                "band": band or "",
                "min_supply_hours": hours,
                "major_users": major_users,
            })
    return out


async def silver_transform(session: AsyncSession, run_id: UUID) -> int:
    result = await session.execute(
        select(
            PdfTableRaw.pdf_url,
            PdfTableRaw.disco_code,
            PdfTableRaw.month_name,
            PdfTableRaw.year,
            PdfTableRaw.page_no,
            PdfTableRaw.table_index,
            PdfTableRaw.rows_jsonb,
        ).where(PdfTableRaw.run_id == run_id)
    )
    count = 0
    seen_key: set[tuple[str, str, int, str, str, str]] = set()
    seen_record_id: set[str] = set()  # avoid duplicate (run_id, record_id) in service_level_commitments_dq
    for r in result.all():
        rows = r.rows_jsonb if isinstance(r.rows_jsonb, list) else []
        slc_rows = _infer_slc_rows(rows)
        for rec in slc_rows:
            if _is_header_row(rec):
                continue
            band = (rec.get("band") or "").strip()
            feeder_name = (rec.get("feeder_name") or "").strip()
            feeder_location = (rec.get("feeder_location") or "").strip()
            disco = (r.disco_code or "").strip()
            month = (r.month_name or "").strip()
            year = int(r.year) if r.year is not None else 0
            business_key = (disco, month, year, feeder_name, feeder_location, band)
            if business_key in seen_key:
                continue
            seen_key.add(business_key)
            record_id = f"{r.pdf_url}|{r.page_no}|{r.table_index}|{feeder_name}|{feeder_location}"
            slc = ServiceLevelCommitments(
                run_id=run_id,
                disco_code=r.disco_code or "",
                month_name=r.month_name or "",
                year=r.year or 0,
                band=band,
                feeder_name=feeder_name,
                feeder_location=feeder_location,
                major_users=rec.get("major_users"),
                min_supply_hours=rec.get("min_supply_hours"),
                source_pdf_url=r.pdf_url,
                source_page_no=r.page_no,
                source_table_index=r.table_index,
            )
            session.add(slc)
            if record_id not in seen_record_id:
                seen_record_id.add(record_id)
                dq_status, reasons = dq_status_for_slc_row(
                    r.disco_code, r.month_name, r.year,
                    feeder_name or None, feeder_location or None,
                    rec.get("min_supply_hours"),
                )
                dq = ServiceLevelCommitmentsDq(
                    run_id=run_id,
                    record_id=record_id,
                    dq_status=dq_status,
                    dq_reasons=reasons,
                )
                session.add(dq)
            count += 1
    await session.flush()
    return count
