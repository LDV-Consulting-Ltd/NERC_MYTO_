"""
Response envelope and meta for consistent API responses.
All product/latest/layer endpoints use: { "data": ..., "meta": { "snapshot_run_id", "refreshed_at", "count", "next_cursor" } }
"""
from typing import Any, Optional
from pydantic import BaseModel


class ResponseMeta(BaseModel):
    snapshot_run_id: Optional[str] = None
    refreshed_at: Optional[str] = None
    count: Optional[int] = None
    next_cursor: Optional[str] = None
    limit: Optional[int] = None
    offset: Optional[int] = None


class EnvelopeResponse(BaseModel):
    data: Any
    meta: Optional[ResponseMeta] = None


def envelope(
    data: Any,
    *,
    snapshot_run_id: Optional[str] = None,
    refreshed_at: Optional[str] = None,
    count: Optional[int] = None,
    next_cursor: Optional[str] = None,
    limit: Optional[int] = None,
    offset: Optional[int] = None,
) -> dict:
    meta = ResponseMeta(
        snapshot_run_id=snapshot_run_id,
        refreshed_at=refreshed_at,
        count=count,
        next_cursor=next_cursor,
        limit=limit,
        offset=offset,
    )
    return {"data": data, "meta": meta.model_dump(exclude_none=True)}


async def get_snapshot_meta(db_session) -> tuple[Optional[str], Optional[str]]:
    """Return (snapshot_run_id, refreshed_at) from latest snapshot."""
    from sqlalchemy import text
    try:
        r = await db_session.execute(text("SELECT run_id, refreshed_at FROM silver.service_level_commitments_geo_latest LIMIT 1"))
        row = r.first()
        if row:
            return (str(row[0]) if row[0] else None, row[1].isoformat() if hasattr(row[1], 'isoformat') else str(row[1]))
    except Exception:
        pass
    return None, None
