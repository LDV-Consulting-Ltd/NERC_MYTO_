"""
Latest: end-user product data APIs. All read from *_latest snapshot.
When latest is empty, fall back to latest run's silver (or bronze for discos) so Explorer, Map, DisCo pages show data.
Envelope: data + meta (snapshot_run_id, refreshed_at, count, next_cursor).
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import json

from app.db import get_db
from app.api.schemas import envelope, get_snapshot_meta

router = APIRouter(tags=["Latest"])


async def _snapshot_or_fallback_run(db: AsyncSession):
    """Return (run_id, refreshed_at). When latest is empty, use last successful run so UIs can show data."""
    snapshot_run_id, refreshed_at = await get_snapshot_meta(db)
    if refreshed_at:
        return snapshot_run_id, refreshed_at
    r = await db.execute(
        text("SELECT run_id, finished_at FROM bronze.etl_run WHERE status = 'success' AND finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 1")
    )
    row = r.first()
    if row:
        return (str(row[0]), row[1].isoformat() if hasattr(row[1], "isoformat") else str(row[1]))
    return None, None


@router.get("/discos")
async def latest_discos(db: AsyncSession = Depends(get_db)):
    snapshot_run_id, refreshed_at = await _snapshot_or_fallback_run(db)
    r = await db.execute(text("SELECT DISTINCT disco_code FROM silver.service_level_commitments_geo_latest ORDER BY disco_code"))
    rows = r.all()
    if not rows:
        # Fallback: latest run's silver or bronze so DisCo Intelligence and filters populate
        if snapshot_run_id:
            r2 = await db.execute(
                text("SELECT DISTINCT disco_code FROM silver.service_level_commitments WHERE run_id = :rid ORDER BY disco_code"),
                {"rid": snapshot_run_id},
            )
            rows = r2.all()
        if not rows:
            r3 = await db.execute(text("SELECT DISTINCT disco_code FROM bronze.pdf_registry ORDER BY disco_code"))
            rows = r3.all()
    data = [x[0] for x in rows]
    return envelope(data, snapshot_run_id=snapshot_run_id, refreshed_at=refreshed_at, count=len(data))


@router.get("/months")
async def latest_months(db: AsyncSession = Depends(get_db), disco_code: str | None = None):
    snapshot_run_id, refreshed_at = await _snapshot_or_fallback_run(db)
    if disco_code:
        r = await db.execute(
            text("SELECT DISTINCT year, month_name FROM silver.service_level_commitments_geo_latest WHERE disco_code = :c ORDER BY year, month_name"),
            {"c": disco_code},
        )
    else:
        r = await db.execute(text("SELECT DISTINCT year, month_name FROM silver.service_level_commitments_geo_latest ORDER BY year, month_name"))
    rows = r.all()
    if not rows and snapshot_run_id:
        if disco_code:
            r = await db.execute(
                text("SELECT DISTINCT year, month_name FROM silver.service_level_commitments WHERE run_id = :rid AND disco_code = :c ORDER BY year, month_name"),
                {"rid": snapshot_run_id, "c": disco_code},
            )
        else:
            r = await db.execute(
                text("SELECT DISTINCT year, month_name FROM silver.service_level_commitments WHERE run_id = :rid ORDER BY year, month_name"),
                {"rid": snapshot_run_id},
            )
        rows = r.all()
    if not rows and snapshot_run_id:
        if disco_code:
            r = await db.execute(text("SELECT DISTINCT year, month_name FROM bronze.pdf_registry WHERE disco_code = :c ORDER BY year, month_name"), {"c": disco_code})
        else:
            r = await db.execute(text("SELECT DISTINCT year, month_name FROM bronze.pdf_registry ORDER BY year, month_name"))
        rows = r.all()
    data = [{"year": x[0], "month_name": x[1]} for x in rows]
    return envelope(data, snapshot_run_id=snapshot_run_id, refreshed_at=refreshed_at, count=len(data))


@router.get("/commitments")
async def latest_commitments(
    db: AsyncSession = Depends(get_db),
    disco_code: str | None = None,
    year: int | None = None,
    month: str | None = None,
    band: str | None = None,
    q: str | None = None,
    limit: int = Query(100, le=1000),
    offset: int = 0,
):
    snapshot_run_id, refreshed_at = await _snapshot_or_fallback_run(db)
    sql = """SELECT run_id, refreshed_at, disco_code, month_name, year, band, feeder_name, feeder_location, lat, lon, min_supply_hours, source_pdf_url, source_page_no
             FROM silver.service_level_commitments_geo_latest WHERE 1=1"""
    params = {"lim": limit, "off": offset}
    if disco_code:
        sql += " AND disco_code = :disco"
        params["disco"] = disco_code
    if year is not None:
        sql += " AND year = :year"
        params["year"] = year
    if month:
        sql += " AND month_name = :month"
        params["month"] = month
    if band:
        sql += " AND band = :band"
        params["band"] = band
    if q:
        sql += " AND (feeder_name ILIKE :q OR feeder_location ILIKE :q)"
        params["q"] = f"%{q}%"
    sql += " ORDER BY year, month_name, disco_code LIMIT :lim OFFSET :off"
    r = await db.execute(text(sql), params)
    rows = r.all()
    if not rows and snapshot_run_id:
        # Fallback: latest run's silver commitments so National Explorer shows data
        sql2 = """SELECT run_id, disco_code, month_name, year, band, feeder_name, feeder_location, major_users, min_supply_hours, source_pdf_url, source_page_no
                  FROM silver.service_level_commitments WHERE run_id = :rid"""
        params2 = {"rid": snapshot_run_id, "lim": limit, "off": offset}
        if disco_code:
            sql2 += " AND disco_code = :disco"
            params2["disco"] = disco_code
        if year is not None:
            sql2 += " AND year = :year"
            params2["year"] = year
        if month:
            sql2 += " AND month_name = :month"
            params2["month"] = month
        if band:
            sql2 += " AND band = :band"
            params2["band"] = band
        if q:
            sql2 += " AND (feeder_name ILIKE :q OR feeder_location ILIKE :q)"
            params2["q"] = f"%{q}%"
        sql2 += " ORDER BY year, month_name, disco_code LIMIT :lim OFFSET :off"
        r2 = await db.execute(text(sql2), params2)
        rows2 = r2.all()
        rows = [
            (x[0], refreshed_at, x[1], x[2], x[3], x[4], x[5], x[6], x[7], None, None, float(x[8]) if x[8] is not None else None, x[9], x[10])
            for x in rows2
        ]
    data = [
        {"run_id": str(x[0]), "refreshed_at": x[1].isoformat() if hasattr(x[1], "isoformat") else (x[1] if isinstance(x[1], str) else None), "disco_code": x[2], "month_name": x[3], "year": x[4],
         "band": x[5], "feeder_name": x[6], "feeder_location": x[7], "lat": x[8], "lon": x[9], "min_supply_hours": float(x[10]) if x[10] is not None else None,
         "source_pdf_url": x[11], "source_page_no": x[12]}
        for x in rows
    ]
    next_cursor = str(offset + limit) if len(rows) == limit else None
    return envelope(data, snapshot_run_id=snapshot_run_id, refreshed_at=refreshed_at, count=len(data), limit=limit, offset=offset, next_cursor=next_cursor)


@router.get("/map-points")
async def latest_map_points(
    db: AsyncSession = Depends(get_db),
    disco_code: str | None = None,
    year: int | None = None,
    month: str | None = None,
    band: str | None = None,
):
    snapshot_run_id, refreshed_at = await _snapshot_or_fallback_run(db)
    sql = """SELECT disco_code, month_name, year, feeder_name, feeder_location, lat, lon, min_supply_hours, ST_AsGeoJSON(geom)::json as geom_json
             FROM silver.service_level_commitments_geo_latest WHERE geom IS NOT NULL"""
    params = {}
    if disco_code:
        sql += " AND disco_code = :disco"
        params["disco"] = disco_code
    if year is not None:
        sql += " AND year = :year"
        params["year"] = year
    if month:
        sql += " AND month_name = :month"
        params["month"] = month
    if band:
        sql += " AND band = :band"
        params["band"] = band
    r = await db.execute(text(sql), params)
    rows = r.all()
    if not rows and snapshot_run_id:
        sql2 = """SELECT disco_code, month_name, year, feeder_name, feeder_location, lat, lon, min_supply_hours, ST_AsGeoJSON(geom)::json as geom_json
                  FROM silver.service_level_commitments_geo WHERE run_id = :rid AND geom IS NOT NULL"""
        params2 = {"rid": snapshot_run_id}
        if disco_code:
            sql2 += " AND disco_code = :disco"
            params2["disco"] = disco_code
        if year is not None:
            sql2 += " AND year = :year"
            params2["year"] = year
        if month:
            sql2 += " AND month_name = :month"
            params2["month"] = month
        if band:
            sql2 += " AND band = :band"
            params2["band"] = band
        r2 = await db.execute(text(sql2), params2)
        rows = r2.all()
    features = []
    for row in rows:
        disco_code_v, month_name, year_v, feeder_name, feeder_location, lat, lon, min_supply_hours, geom_json = row
        geom = json.loads(geom_json) if isinstance(geom_json, str) else geom_json if geom_json else ({"type": "Point", "coordinates": [lon, lat]} if lat is not None and lon is not None else None)
        if not geom:
            continue
        features.append({
            "type": "Feature",
            "geometry": geom,
            "properties": {"disco_code": disco_code_v, "month_name": month_name, "year": year_v, "feeder_name": feeder_name, "feeder_location": feeder_location, "min_supply_hours": float(min_supply_hours) if min_supply_hours else None},
        })
    fc = {"type": "FeatureCollection", "features": features}
    return envelope(fc, snapshot_run_id=snapshot_run_id, refreshed_at=refreshed_at, count=len(features))


@router.get("/feeders")
async def latest_feeders(
    db: AsyncSession = Depends(get_db),
    disco_code: str | None = None,
    q: str | None = None,
    limit: int = Query(100, le=500),
    offset: int = 0,
):
    snapshot_run_id, refreshed_at = await get_snapshot_meta(db)
    sql = """SELECT DISTINCT fd.feeder_key, d.disco_code, fd.feeder_name, fd.band
             FROM gold.dim_feeder fd
             JOIN gold.dim_disco d ON d.disco_key = fd.disco_key
             JOIN gold.fact_supply_commitment_latest f ON f.feeder_key = fd.feeder_key WHERE 1=1"""
    params = {"lim": limit, "off": offset}
    if disco_code:
        sql += " AND d.disco_code = :disco"
        params["disco"] = disco_code
    if q:
        sql += " AND fd.feeder_name ILIKE :q"
        params["q"] = f"%{q}%"
    sql += " ORDER BY d.disco_code, fd.feeder_name LIMIT :lim OFFSET :off"
    r = await db.execute(text(sql), params)
    rows = r.all()
    data = [{"feeder_key": row[0], "disco_code": row[1], "feeder_name": row[2], "band": row[3]} for row in rows]
    next_cursor = str(offset + limit) if len(rows) == limit else None
    return envelope(data, snapshot_run_id=snapshot_run_id, refreshed_at=refreshed_at, count=len(data), limit=limit, offset=offset, next_cursor=next_cursor)


@router.get("/feeder/{feeder_key}")
async def latest_feeder(feeder_key: int, db: AsyncSession = Depends(get_db)):
    snapshot_run_id, refreshed_at = await get_snapshot_meta(db)
    r = await db.execute(
        text("""
            SELECT f.run_id, f.refreshed_at, f.date_key, f.disco_key, f.feeder_key, f.location_key, f.min_supply_hours, f.source_pdf_url,
                   d.disco_code, fd.feeder_name, fd.band
            FROM gold.fact_supply_commitment_latest f
            JOIN gold.dim_disco d ON d.disco_key = f.disco_key
            JOIN gold.dim_feeder fd ON fd.feeder_key = f.feeder_key
            WHERE f.feeder_key = :fk
        """),
        {"fk": feeder_key},
    )
    rows = r.all()
    if not rows:
        raise HTTPException(404, "Feeder not found")
    commitments = [{"run_id": str(x[0]), "refreshed_at": x[1].isoformat() if hasattr(x[1], "isoformat") else None, "date_key": x[2], "disco_code": x[8], "feeder_name": x[9], "band": x[10], "min_supply_hours": float(x[6]) if x[6] else None} for x in rows]
    loc_r = await db.execute(text("SELECT location_key, location_text_norm, lat, lon FROM gold.dim_location WHERE location_key IN (SELECT DISTINCT location_key FROM gold.fact_supply_commitment_latest WHERE feeder_key = :fk AND location_key IS NOT NULL)"), {"fk": feeder_key})
    locations = [{"location_key": row[0], "location_text_norm": row[1], "lat": row[2], "lon": row[3]} for row in loc_r.all()]
    data = {"feeder_key": feeder_key, "commitments": commitments, "locations": locations, "source_pdf_url": rows[0][7] if rows else None}
    return envelope(data, snapshot_run_id=snapshot_run_id, refreshed_at=refreshed_at)


@router.get("/search")
async def latest_search(
    db: AsyncSession = Depends(get_db),
    q: str = Query(..., min_length=1),
    limit: int = Query(50, le=200),
    offset: int = 0,
):
    """Unified search across feeder_name, feeder_location, major_users."""
    snapshot_run_id, refreshed_at = await _snapshot_or_fallback_run(db)
    sql = """SELECT run_id, refreshed_at, disco_code, month_name, year, band, feeder_name, feeder_location, major_users, min_supply_hours, source_pdf_url
             FROM silver.service_level_commitments_geo_latest
             WHERE feeder_name ILIKE :q OR feeder_location ILIKE :q OR major_users ILIKE :q
             ORDER BY year, month_name LIMIT :lim OFFSET :off"""
    r = await db.execute(text(sql), {"q": f"%{q}%", "lim": limit, "off": offset})
    rows = r.all()
    if not rows and snapshot_run_id:
        sql2 = """SELECT run_id, disco_code, month_name, year, band, feeder_name, feeder_location, major_users, min_supply_hours, source_pdf_url
                  FROM silver.service_level_commitments WHERE run_id = :rid
                  AND (feeder_name ILIKE :q OR feeder_location ILIKE :q OR major_users ILIKE :q)
                  ORDER BY year, month_name LIMIT :lim OFFSET :off"""
        r2 = await db.execute(text(sql2), {"rid": snapshot_run_id, "q": f"%{q}%", "lim": limit, "off": offset})
        rows2 = r2.all()
        rows = [(x[0], refreshed_at, x[1], x[2], x[3], x[4], x[5], x[6], x[7], x[8], float(x[8]) if x[8] is not None else None, x[9]) for x in rows2]
    data = [
        {"run_id": str(x[0]), "refreshed_at": x[1].isoformat() if hasattr(x[1], "isoformat") else (x[1] if isinstance(x[1], str) else None), "disco_code": x[2], "month_name": x[3], "year": x[4],
         "band": x[5], "feeder_name": x[6], "feeder_location": x[7], "major_users": x[8], "min_supply_hours": float(x[9]) if x[9] is not None else None, "source_pdf_url": x[10]}
        for x in rows
    ]
    return envelope(data, snapshot_run_id=snapshot_run_id, refreshed_at=refreshed_at, count=len(data), limit=limit, offset=offset)
