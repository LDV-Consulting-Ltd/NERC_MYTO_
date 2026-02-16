"""Geocode cache read/write."""
from typing import Optional, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.silver import GeocodeCache


async def get_cached_geocode(
    session: AsyncSession, location_text_norm: str
) -> Optional[tuple[float, float, str, float]]:
    r = await session.execute(
        select(
            GeocodeCache.lat,
            GeocodeCache.lon,
            GeocodeCache.provider,
            GeocodeCache.confidence,
        ).where(GeocodeCache.location_text_norm == location_text_norm)
    )
    row = r.one_or_none()
    if row is None:
        return None
    return (row[0], row[1], row[2] or "", row[3] or 0.0)


async def set_cached_geocode(
    session: AsyncSession,
    location_text_norm: str,
    lat: float,
    lon: float,
    provider: str,
    confidence: float,
    raw_response: Optional[Any] = None,
) -> None:
    row = GeocodeCache(
        location_text_norm=location_text_norm,
        provider=provider,
        lat=lat,
        lon=lon,
        confidence=confidence,
        raw_response=raw_response,
    )
    await session.merge(row)
    await session.flush()
