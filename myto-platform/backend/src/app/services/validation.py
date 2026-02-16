"""DQ validation and scoring."""
from decimal import Decimal
from typing import Any, Optional
from uuid import UUID


def parse_min_supply_hours(value: Any) -> Optional[Decimal]:
    if value is None or value == "":
        return None
    try:
        if isinstance(value, (int, float)):
            return Decimal(str(value))
        s = str(value).strip().replace(",", "")
        return Decimal(s) if s else None
    except Exception:
        return None


def dq_status_for_slc_row(
    disco_code: Optional[str],
    month_name: Optional[str],
    year: Optional[int],
    feeder_name: Optional[str],
    feeder_location: Optional[str],
    min_supply_hours: Any,
) -> tuple[str, list[str]]:
    reasons = []
    if not disco_code or not str(disco_code).strip():
        reasons.append("missing_disco_code")
    if not month_name or not str(month_name).strip():
        reasons.append("missing_month_name")
    if year is None or (isinstance(year, (int, float)) and (year < 2000 or year > 2100)):
        reasons.append("invalid_year")
    if min_supply_hours is not None:
        h = parse_min_supply_hours(min_supply_hours)
        if h is not None and (h < 0 or h > 8760):
            reasons.append("min_supply_hours_out_of_range")
    status = "fail" if reasons else "pass"
    return status, reasons
