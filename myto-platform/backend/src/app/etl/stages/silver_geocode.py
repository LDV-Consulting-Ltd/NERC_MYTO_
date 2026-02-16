"""
Silver geocode: for each silver.service_level_commitments row, normalize location ->
cache lookup -> fuzzy match against cache -> online fallback. Write silver.service_level_commitments_geo.
"""
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from geoalchemy2 import WKTElement
from app.models.silver import ServiceLevelCommitments, GeocodeCache, ServiceLevelCommitmentsGeo
from app.etl.geocoding.normalize import normalize_location
from app.etl.geocoding.fuzzy import fuzzy_match
from app.etl.geocoding.providers import geocode_online
from app.services.caching import get_cached_geocode, set_cached_geocode


def _wkt_point(lat: float, lon: float) -> WKTElement:
    return WKTElement(f"POINT({lon} {lat})", srid=4326)


async def silver_geocode(session: AsyncSession, run_id: UUID) -> int:
    result = await session.execute(
        select(ServiceLevelCommitments).where(ServiceLevelCommitments.run_id == run_id)
    )
    rows = result.scalars().all()
    cache_result = await session.execute(
        select(GeocodeCache.location_text_norm, GeocodeCache.lat, GeocodeCache.lon).where(
            GeocodeCache.lat.isnot(None),
            GeocodeCache.lon.isnot(None),
        )
    )
    cache_list = [(r[0], r[1], r[2]) for r in cache_result.all()]
    count = 0
    for slc in rows:
        loc_raw = (slc.feeder_location or "").strip() or (slc.feeder_name or "").strip()
        location_text_norm = normalize_location(loc_raw) if loc_raw else ""
        lat, lon, provider, confidence = None, None, None, None
        if location_text_norm:
            cached = await get_cached_geocode(session, location_text_norm)
            if cached:
                lat, lon, provider, confidence = cached
            else:
                fuzzy = fuzzy_match(location_text_norm, cache_list)
                if fuzzy:
                    lat, lon, confidence = fuzzy
                    provider = "fuzzy"
                    await set_cached_geocode(session, location_text_norm, lat, lon, "fuzzy", confidence)
                else:
                    online = await geocode_online(location_text_norm)
                    if online:
                        lat, lon, provider, confidence = online
                        await set_cached_geocode(session, location_text_norm, lat, lon, provider, confidence)
        geom = _wkt_point(lat, lon) if (lat is not None and lon is not None) else None
        geo = ServiceLevelCommitmentsGeo(
            run_id=run_id,
            disco_code=slc.disco_code,
            month_name=slc.month_name,
            year=slc.year,
            band=slc.band or "",
            feeder_name=slc.feeder_name or "",
            feeder_location=slc.feeder_location or "",
            location_text_norm=location_text_norm or None,
            lat=lat,
            lon=lon,
            geocode_provider=provider,
            geocode_confidence=confidence,
            geom=geom,
            major_users=slc.major_users,
            min_supply_hours=slc.min_supply_hours,
            source_pdf_url=slc.source_pdf_url,
            source_page_no=slc.source_page_no,
            source_table_index=slc.source_table_index,
        )
        session.add(geo)
        count += 1
    await session.flush()
    return count
