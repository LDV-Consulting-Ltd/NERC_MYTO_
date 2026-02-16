from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.db import get_db
from app.api.schemas import envelope, get_snapshot_meta

router = APIRouter(tags=["Metadata"])

DATASETS = [
    {"name": "bronze.etl_run", "layer": "bronze", "description": "ETL run metadata"},
    {"name": "bronze.etl_stage", "layer": "bronze", "description": "Per-run stage status"},
    {"name": "bronze.etl_event", "layer": "bronze", "description": "Stage events/logs"},
    {"name": "bronze.pdf_registry", "layer": "bronze", "description": "Discovered PDFs"},
    {"name": "bronze.pdf_artifact", "layer": "bronze", "description": "Downloaded PDF bytes"},
    {"name": "bronze.pdf_table_raw", "layer": "bronze", "description": "Raw extracted tables"},
    {"name": "silver.service_level_commitments", "layer": "silver", "description": "Typed SLC rows"},
    {"name": "silver.service_level_commitments_dq", "layer": "silver", "description": "DQ status per record"},
    {"name": "silver.geocode_cache", "layer": "silver", "description": "Geocode cache"},
    {"name": "silver.service_level_commitments_geo", "layer": "silver", "description": "SLC with geometry"},
    {"name": "silver.service_level_commitments_geo_latest", "layer": "latest", "description": "Latest SLC snapshot"},
    {"name": "gold.dim_disco", "layer": "gold", "description": "Disco dimension"},
    {"name": "gold.dim_date", "layer": "gold", "description": "Date dimension"},
    {"name": "gold.dim_feeder", "layer": "gold", "description": "Feeder dimension"},
    {"name": "gold.dim_location", "layer": "gold", "description": "Location dimension"},
    {"name": "gold.fact_supply_commitment", "layer": "gold", "description": "Supply commitment fact"},
    {"name": "gold.fact_supply_commitment_latest", "layer": "latest", "description": "Latest fact snapshot"},
]

COLUMN_DICTIONARY = [
    {"column": "disco_code", "dataset": "silver.service_level_commitments_geo_latest", "type": "text", "definition": "Distribution company code (first token from MYTO title)."},
    {"column": "month_name", "dataset": "silver.service_level_commitments_geo_latest", "type": "text", "definition": "Month name from source PDF."},
    {"column": "year", "dataset": "silver.service_level_commitments_geo_latest", "type": "int", "definition": "Year from source PDF."},
    {"column": "feeder_name", "dataset": "silver.service_level_commitments_geo_latest", "type": "text", "definition": "Feeder name from Service Level Commitments table."},
    {"column": "feeder_location", "dataset": "silver.service_level_commitments_geo_latest", "type": "text", "definition": "Feeder location / address."},
    {"column": "min_supply_hours", "dataset": "silver.service_level_commitments_geo_latest", "type": "numeric", "definition": "Minimum supply hours commitment."},
    {"column": "lat", "dataset": "silver.service_level_commitments_geo_latest", "type": "float", "definition": "Latitude from geocoding."},
    {"column": "lon", "dataset": "silver.service_level_commitments_geo_latest", "type": "float", "definition": "Longitude from geocoding."},
]


@router.get("/datasets")
async def list_datasets():
    return envelope(DATASETS, count=len(DATASETS))


@router.get("/datasets/{name}/schema")
async def get_dataset_schema(name: str):
    for d in DATASETS:
        if d["name"] == name:
            return envelope({"name": name, "layer": d["layer"], "description": d["description"], "columns": []}, count=1)
    raise HTTPException(404, "Dataset not found")


@router.get("/columns/dictionary")
async def columns_dictionary():
    return envelope(COLUMN_DICTIONARY, count=len(COLUMN_DICTIONARY))


@router.get("/coverage")
async def metadata_coverage(db: AsyncSession = Depends(get_db)):
    snapshot_run_id, refreshed_at = await get_snapshot_meta(db)
    r = await db.execute(text("SELECT count(*) FROM silver.service_level_commitments_geo_latest"))
    total = (r.scalars().first() or 0)
    r2 = await db.execute(text("SELECT count(*) FROM silver.service_level_commitments_geo_latest WHERE lat IS NOT NULL AND lon IS NOT NULL"))
    geo_count = (r2.scalars().first() or 0)
    geocode_pct = round(100 * geo_count / total, 1) if total else 0
    r3 = await db.execute(text("SELECT count(*) FROM bronze.pdf_table_raw"))
    raw_tables = (r3.scalars().first() or 0)
    r4 = await db.execute(text("SELECT count(*) FROM bronze.pdf_registry"))
    pdfs_discovered = (r4.scalars().first() or 0)
    parse_pct = round(100 * raw_tables / pdfs_discovered, 1) if pdfs_discovered else 0
    # Frontend expects total_records, geocode_coverage_pct, extraction_coverage_pct; when latest empty, surface bronze
    total_records = total if total else raw_tables
    data = {
        "geocode_pct": geocode_pct,
        "geocode_coverage_pct": geocode_pct,
        "extraction_coverage_pct": parse_pct,
        "parse_pct": parse_pct,
        "total_rows_latest": total,
        "total_records": total_records,
        "geocoded_count": geo_count,
        "pdfs_discovered": pdfs_discovered,
        "raw_tables_extracted": raw_tables,
    }
    return envelope(data, snapshot_run_id=snapshot_run_id, refreshed_at=refreshed_at)


@router.get("/freshness")
async def metadata_freshness(db: AsyncSession = Depends(get_db)):
    snapshot_run_id, refreshed_at = await get_snapshot_meta(db)
    total_rows = 0
    disco_count = 0
    month_range = None
    # When latest snapshot is empty, fall back to last completed run so catalog shows pipeline activity
    if not refreshed_at:
        r = await db.execute(
            text("SELECT run_id, finished_at FROM bronze.etl_run WHERE status = 'success' AND finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 1")
        )
        row = r.first()
        if row:
            snapshot_run_id = str(row[0])
            refreshed_at = row[1].isoformat() if hasattr(row[1], "isoformat") else str(row[1])
            # Surface counts from that run's silver (or bronze) so strip/catalog show activity
            r2 = await db.execute(
                text("SELECT count(*) FROM silver.service_level_commitments WHERE run_id = :rid"),
                {"rid": snapshot_run_id},
            )
            total_rows = (r2.scalars().first() or 0)
            if total_rows == 0:
                r3 = await db.execute(text("SELECT count(*) FROM bronze.pdf_table_raw"))
                total_rows = (r3.scalars().first() or 0)
            r4 = await db.execute(
                text("SELECT count(DISTINCT disco_code) FROM silver.service_level_commitments WHERE run_id = :rid"),
                {"rid": snapshot_run_id},
            )
            disco_count = (r4.scalars().first() or 0)
            if disco_count == 0:
                r5 = await db.execute(text("SELECT count(DISTINCT disco_code) FROM bronze.pdf_registry"))
                disco_count = (r5.scalars().first() or 0)
            if total_rows > 0:
                r6 = await db.execute(
                    text("SELECT min(year)::text || ' ' || min(month_name), max(year)::text || ' ' || max(month_name) FROM bronze.pdf_registry")
                )
                row6 = r6.first()
                if row6 and row6[0] and row6[1]:
                    month_range = f"{row6[0]} – {row6[1]}"
    else:
        r = await db.execute(text("SELECT count(*), count(DISTINCT disco_code) FROM silver.service_level_commitments_geo_latest"))
        row = r.first()
        if row:
            total_rows, disco_count = row[0] or 0, row[1] or 0
        r2 = await db.execute(text("SELECT min(year)::text || ' ' || min(month_name), max(year)::text || ' ' || max(month_name) FROM silver.service_level_commitments_geo_latest"))
        row2 = r2.first()
        if row2 and row2[0] and row2[1]:
            month_range = f"{row2[0]} – {row2[1]}"
    data = {
        "snapshot_run_id": snapshot_run_id,
        "refreshed_at": refreshed_at,
        "latest_run_id": snapshot_run_id,
        "total_rows": total_rows,
        "disco_count": disco_count,
        "month_range": month_range or "—",
        "age_seconds": None,
    }
    if refreshed_at:
        from datetime import datetime, timezone
        try:
            dt = datetime.fromisoformat(refreshed_at.replace("Z", "+00:00"))
            data["age_seconds"] = int((datetime.now(timezone.utc) - dt).total_seconds())
        except Exception:
            pass
    return envelope(data, snapshot_run_id=snapshot_run_id, refreshed_at=refreshed_at)
