from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import csv
import io
import json

from app.db import get_db

router = APIRouter(tags=["Exports"])


def _latest_commitments_where(disco_code: str | None, year: int | None, month: str | None, band: str | None) -> tuple[str, dict]:
    sql = "FROM silver.service_level_commitments_geo_latest WHERE 1=1"
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
    return sql, params


@router.get("/latest/commitments.csv")
async def export_commitments_csv(
    db: AsyncSession = Depends(get_db),
    disco: str | None = None,
    year: int | None = None,
    month: str | None = None,
    band: str | None = None,
):
    where, params = _latest_commitments_where(disco, year, month, band)
    r = await db.execute(
        text(f"SELECT run_id, refreshed_at, disco_code, month_name, year, band, feeder_name, feeder_location, lat, lon, min_supply_hours, source_pdf_url {where}"),
        params,
    )
    rows = r.all()
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["run_id", "refreshed_at", "disco_code", "month_name", "year", "band", "feeder_name", "feeder_location", "lat", "lon", "min_supply_hours", "source_pdf_url"])
    for row in rows:
        w.writerow([str(x) if x is not None else "" for x in row])
    buf.seek(0)
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=commitments.csv"})


@router.get("/latest/commitments.parquet")
async def export_commitments_parquet(
    db: AsyncSession = Depends(get_db),
    disco: str | None = None,
    year: int | None = None,
    month: str | None = None,
    band: str | None = None,
):
    from fastapi import HTTPException
    raise HTTPException(501, "Parquet export not implemented; use CSV or GeoJSON")


@router.get("/latest/map.geojson")
async def export_map_geojson(
    db: AsyncSession = Depends(get_db),
    disco: str | None = None,
    year: int | None = None,
    month: str | None = None,
    band: str | None = None,
):
    where, params = _latest_commitments_where(disco, year, month, band)
    r = await db.execute(
        text(f"SELECT disco_code, month_name, year, feeder_name, feeder_location, lat, lon, min_supply_hours, ST_AsGeoJSON(geom)::json as geom_json {where} AND geom IS NOT NULL"),
        params,
    )
    rows = r.all()
    features = []
    for row in rows:
        disco_code, month_name, year_v, feeder_name, feeder_location, lat, lon, min_supply_hours, geom_json = row
        geom = json.loads(geom_json) if isinstance(geom_json, str) else geom_json if geom_json else {"type": "Point", "coordinates": [lon, lat]}
        features.append({
            "type": "Feature",
            "geometry": geom,
            "properties": {"disco_code": disco_code, "month_name": month_name, "year": year_v, "feeder_name": feeder_name, "feeder_location": feeder_location, "min_supply_hours": float(min_supply_hours) if min_supply_hours else None},
        })
    fc = {"type": "FeatureCollection", "features": features}
    return fc
