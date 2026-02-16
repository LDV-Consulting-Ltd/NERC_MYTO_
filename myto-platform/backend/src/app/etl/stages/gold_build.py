"""
Gold build: from silver.service_level_commitments_geo build star schema
(dim_disco, dim_date, dim_feeder, dim_location, fact_supply_commitment).
One fact per (run_id, date_key, disco_key, feeder_key, location_key).
"""
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from geoalchemy2 import WKTElement
from app.models.silver import ServiceLevelCommitmentsGeo
from app.models.gold import DimDisco, DimDate, DimFeeder, DimLocation, FactSupplyCommitment

MONTH_NUM = {
    "JANUARY": 1, "FEBRUARY": 2, "MARCH": 3, "APRIL": 4, "MAY": 5, "JUNE": 6,
    "JULY": 7, "AUGUST": 8, "SEPTEMBER": 9, "OCTOBER": 10, "NOVEMBER": 11, "DECEMBER": 12,
}


async def gold_build(session: AsyncSession, run_id: UUID) -> int:
    result = await session.execute(
        select(ServiceLevelCommitmentsGeo).where(ServiceLevelCommitmentsGeo.run_id == run_id)
    )
    rows = result.scalars().all()
    disco_keys = {}
    date_keys = {}
    feeder_keys = {}
    location_keys = {}
    facts_seen = set()
    count = 0
    for r in rows:
        disco_code = r.disco_code or ""
        if disco_code and disco_code not in disco_keys:
            disc = DimDisco(disco_code=disco_code, disco_name=None)
            session.add(disc)
            await session.flush()
            disco_keys[disco_code] = disc.disco_key
        disco_key = disco_keys.get(disco_code)
        if not disco_key:
            continue
        year = r.year or 0
        month_name = (r.month_name or "").upper()
        month_num = MONTH_NUM.get(month_name, 1)
        date_key = year * 100 + month_num
        if date_key not in date_keys:
            dim_d = DimDate(date_key=date_key, year=year, month=month_num, month_name=r.month_name or "")
            session.add(dim_d)
            await session.flush()
            date_keys[date_key] = date_key
        feeder_name = r.feeder_name or ""
        band = r.band or ""
        key_feeder = (disco_key, feeder_name, band)
        if key_feeder not in feeder_keys:
            fd = DimFeeder(disco_key=disco_key, feeder_name=feeder_name, band=band)
            session.add(fd)
            await session.flush()
            feeder_keys[key_feeder] = fd.feeder_key
        feeder_key = feeder_keys[key_feeder]
        loc_norm = r.location_text_norm or ""
        location_key = None
        if loc_norm and r.lat is not None and r.lon is not None:
            if loc_norm not in location_keys:
                geom = WKTElement(f"POINT({r.lon} {r.lat})", srid=4326)
                dl = DimLocation(
                    location_text_norm=loc_norm, lat=r.lat, lon=r.lon, geom=geom,
                    provider=r.geocode_provider, confidence=r.geocode_confidence,
                )
                session.add(dl)
                await session.flush()
                location_keys[loc_norm] = dl.location_key
            location_key = location_keys.get(loc_norm)
        fact_key = (run_id, date_key, disco_key, feeder_key, location_key)
        if fact_key in facts_seen:
            continue
        facts_seen.add(fact_key)
        fact = FactSupplyCommitment(
            run_id=run_id,
            date_key=date_key,
            disco_key=disco_key,
            feeder_key=feeder_key,
            location_key=location_key,
            min_supply_hours=r.min_supply_hours,
            source_pdf_url=r.source_pdf_url,
            source_page_no=r.source_page_no,
        )
        session.add(fact)
        count += 1
    await session.flush()
    return count
