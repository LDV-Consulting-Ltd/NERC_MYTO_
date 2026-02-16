"""
Layers: browse medallion (bronze, silver, gold).
GET /v1/layers/bronze/pdfs | artifacts | tables
GET /v1/layers/silver/commitments | dq | geocode
GET /v1/layers/gold/dims | facts
"""
from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select, func

from app.db import get_db
from app.api.schemas import envelope, get_snapshot_meta

router = APIRouter(tags=["Layers"])


# ----- Bronze -----
@router.get("/bronze/pdfs")
async def bronze_pdfs(db: AsyncSession = Depends(get_db), run_id: UUID | None = None, limit: int = 100, offset: int = 0):
    if run_id:
        r = await db.execute(
            text("SELECT pdf_url, title, disco_code, month_name, year, discovered_at FROM bronze.pdf_registry WHERE run_id = :rid ORDER BY discovered_at DESC LIMIT :lim OFFSET :off"),
            {"rid": str(run_id), "lim": limit, "off": offset},
        )
    else:
        r = await db.execute(
            text("SELECT run_id, pdf_url, title, disco_code, month_name, year, discovered_at FROM bronze.pdf_registry ORDER BY discovered_at DESC LIMIT :lim OFFSET :off"),
            {"lim": limit, "off": offset},
        )
    rows = r.all()
    data = []
    for row in rows:
        if run_id:
            data.append({
                "run_id": str(run_id),
                "pdf_url": row[0], "title": row[1], "disco_code": row[2], "month_name": row[3], "year": row[4],
                "discovered_at": row[5].isoformat() if hasattr(row[5], "isoformat") else None,
            })
        else:
            data.append({
                "run_id": str(row[0]),
                "pdf_url": row[1], "title": row[2], "disco_code": row[3], "month_name": row[4], "year": row[5],
                "discovered_at": row[6].isoformat() if hasattr(row[6], "isoformat") else None,
            })
    return envelope(data, count=len(data), limit=limit, offset=offset)


@router.get("/bronze/artifacts")
async def bronze_artifacts(db: AsyncSession = Depends(get_db), run_id: UUID | None = None, limit: int = 100, offset: int = 0):
    if run_id:
        r = await db.execute(
            text("SELECT pdf_url, sha256, downloaded_at, http_status, content_type, length(file_bytes) as size FROM bronze.pdf_artifact WHERE run_id = :rid ORDER BY downloaded_at DESC LIMIT :lim OFFSET :off"),
            {"rid": str(run_id), "lim": limit, "off": offset},
        )
    else:
        r = await db.execute(
            text("SELECT run_id, pdf_url, sha256, downloaded_at, http_status, content_type FROM bronze.pdf_artifact ORDER BY downloaded_at DESC LIMIT :lim OFFSET :off"),
            {"lim": limit, "off": offset},
        )
    rows = r.all()
    data = []
    for row in rows:
        if run_id:
            data.append({
                "run_id": str(run_id),
                "pdf_url": row[0], "sha256": row[1], "downloaded_at": row[2].isoformat() if hasattr(row[2], "isoformat") else None,
                "http_status": row[3], "content_type": row[4], "size_bytes": row[5] if len(row) > 5 else None,
            })
        else:
            data.append({
                "run_id": str(row[0]), "pdf_url": row[1], "sha256": row[2],
                "downloaded_at": row[3].isoformat() if hasattr(row[3], "isoformat") else None, "http_status": row[4], "content_type": row[5],
            })
    return envelope(data, count=len(data), limit=limit, offset=offset)


@router.get("/bronze/tables")
async def bronze_tables(
    db: AsyncSession = Depends(get_db),
    run_id: UUID | None = None,
    disco_code: str | None = None,
    month_name: str | None = None,
    pdf_url: str | None = None,
    limit: int = 50,
    offset: int = 0,
):
    q = "SELECT run_id, pdf_url, disco_code, month_name, year, page_no, table_index, table_name, method, confidence, extracted_at FROM bronze.pdf_table_raw WHERE 1=1"
    params = {"lim": limit, "off": offset}
    if run_id:
        q += " AND run_id = :rid"
        params["rid"] = str(run_id)
    if disco_code:
        q += " AND disco_code = :disco"
        params["disco"] = disco_code
    if month_name:
        q += " AND month_name = :month"
        params["month"] = month_name
    if pdf_url:
        q += " AND pdf_url = :pdf"
        params["pdf"] = pdf_url
    q += " ORDER BY extracted_at DESC LIMIT :lim OFFSET :off"
    r = await db.execute(text(q), params)
    rows = r.all()
    data = [
        {
            "run_id": str(row[0]), "pdf_url": row[1], "disco_code": row[2], "month_name": row[3], "year": row[4],
            "page_no": row[5], "table_index": row[6], "table_name": row[7], "method": row[8], "confidence": row[9],
            "extracted_at": row[10].isoformat() if hasattr(row[10], "isoformat") else None,
        }
        for row in rows
    ]
    return envelope(data, count=len(data), limit=limit, offset=offset)


# ----- Silver -----
@router.get("/silver/commitments")
async def silver_commitments(
    db: AsyncSession = Depends(get_db),
    run_id: UUID | None = None,
    disco_code: str | None = None,
    limit: int = 100,
    offset: int = 0,
):
    snapshot_run_id, refreshed_at = await get_snapshot_meta(db)
    if run_id:
        q = """SELECT run_id, disco_code, month_name, year, band, feeder_name, feeder_location, major_users, min_supply_hours, source_pdf_url, source_page_no
               FROM silver.service_level_commitments WHERE run_id = :rid ORDER BY disco_code, year, month_name LIMIT :lim OFFSET :off"""
        r = await db.execute(text(q), {"rid": str(run_id), "lim": limit, "off": offset})
    else:
        q = """SELECT run_id, disco_code, month_name, year, band, feeder_name, feeder_location, major_users, min_supply_hours, source_pdf_url, source_page_no
               FROM silver.service_level_commitments_geo_latest WHERE 1=1"""
        params = {"lim": limit, "off": offset}
        if disco_code:
            q += " AND disco_code = :disco"
            params["disco"] = disco_code
        q += " ORDER BY disco_code, year, month_name LIMIT :lim OFFSET :off"
        r = await db.execute(text(q), params)
    rows = r.all()
    data = [
        {"run_id": str(row[0]), "disco_code": row[1], "month_name": row[2], "year": row[3], "band": row[4],
         "feeder_name": row[5], "feeder_location": row[6], "major_users": row[7], "min_supply_hours": float(row[8]) if row[8] is not None else None,
         "source_pdf_url": row[9], "source_page_no": row[10]}
        for row in rows
    ]
    return envelope(data, snapshot_run_id=snapshot_run_id, refreshed_at=refreshed_at, count=len(data), limit=limit, offset=offset)


@router.get("/silver/dq")
async def silver_dq(
    db: AsyncSession = Depends(get_db),
    run_id: UUID | None = None,
    dq_status: str | None = None,
    limit: int = 200,
    offset: int = 0,
):
    snapshot_run_id, refreshed_at = await get_snapshot_meta(db)
    if run_id:
        q = "SELECT record_id, dq_status, dq_reasons, created_at FROM silver.service_level_commitments_dq WHERE run_id = :rid"
        params = {"rid": str(run_id), "lim": limit, "off": offset}
    else:
        q = """SELECT record_id, dq_status, dq_reasons, created_at, run_id FROM silver.service_level_commitments_dq
               WHERE run_id = (SELECT run_id FROM silver.service_level_commitments_geo_latest LIMIT 1)"""
        params = {"lim": limit, "off": offset}
    if dq_status:
        q += " AND dq_status = :status"
        params["status"] = dq_status
    q += " ORDER BY created_at DESC LIMIT :lim OFFSET :off"
    r = await db.execute(text(q), params)
    rows = r.all()
    data = [
        {"record_id": row[0], "dq_status": row[1], "dq_reasons": row[2], "created_at": row[3].isoformat() if hasattr(row[3], "isoformat") else None}
        for row in rows
    ]
    if not run_id and rows and len(rows[0]) > 4:
        for i, row in enumerate(rows):
            data[i]["run_id"] = str(row[4])
    return envelope(data, snapshot_run_id=snapshot_run_id, refreshed_at=refreshed_at, count=len(data), limit=limit, offset=offset)


@router.get("/silver/geocode")
async def silver_geocode(db: AsyncSession = Depends(get_db)):
    snapshot_run_id, refreshed_at = await get_snapshot_meta(db)
    r = await db.execute(text("SELECT count(*) FROM silver.geocode_cache"))
    cache_count = (r.scalars().first() or 0)
    r2 = await db.execute(text("SELECT count(*) FROM silver.service_level_commitments_geo_latest WHERE lat IS NOT NULL AND lon IS NOT NULL"))
    geo_count = (r2.scalars().first() or 0)
    r3 = await db.execute(text("SELECT count(*) FROM silver.service_level_commitments_geo_latest"))
    total = (r3.scalars().first() or 0)
    coverage_pct = round(100 * geo_count / total, 1) if total else 0
    data = {"coverage_pct": coverage_pct, "geocoded_count": geo_count, "total_count": total, "cache_entries": cache_count}
    return envelope(data, snapshot_run_id=snapshot_run_id, refreshed_at=refreshed_at)


# ----- Gold -----
@router.get("/gold/dims")
async def gold_dims(db: AsyncSession = Depends(get_db)):
    snapshot_run_id, refreshed_at = await get_snapshot_meta(db)
    dims = {}
    for table, key in [("gold.dim_disco", "disco"), ("gold.dim_date", "date"), ("gold.dim_feeder", "feeder"), ("gold.dim_location", "location")]:
        r = await db.execute(text(f"SELECT count(*) FROM {table}"))
        dims[key] = r.scalars().first() or 0
    r = await db.execute(text("SELECT disco_code, disco_name FROM gold.dim_disco LIMIT 20"))
    disco_preview = [{"disco_code": row[0], "disco_name": row[1]} for row in r.all()]
    data = {"counts": dims, "preview": {"dim_disco": disco_preview}}
    return envelope(data, snapshot_run_id=snapshot_run_id, refreshed_at=refreshed_at)


@router.get("/gold/facts")
async def gold_facts(
    db: AsyncSession = Depends(get_db),
    disco_code: str | None = None,
    date_key: int | None = None,
    limit: int = 100,
    offset: int = 0,
):
    snapshot_run_id, refreshed_at = await get_snapshot_meta(db)
    q = """SELECT f.run_id, f.date_key, d.disco_code, fd.feeder_name, fd.band, f.min_supply_hours, f.source_pdf_url
           FROM gold.fact_supply_commitment_latest f
           JOIN gold.dim_disco d ON d.disco_key = f.disco_key
           JOIN gold.dim_feeder fd ON fd.feeder_key = f.feeder_key WHERE 1=1"""
    params = {"lim": limit, "off": offset}
    if disco_code:
        q += " AND d.disco_code = :disco"
        params["disco"] = disco_code
    if date_key:
        q += " AND f.date_key = :dk"
        params["dk"] = date_key
    q += " ORDER BY f.date_key DESC LIMIT :lim OFFSET :off"
    r = await db.execute(text(q), params)
    rows = r.all()
    data = [
        {"run_id": str(row[0]), "date_key": row[1], "disco_code": row[2], "feeder_name": row[3], "band": row[4],
         "min_supply_hours": float(row[5]) if row[5] is not None else None, "source_pdf_url": row[6]}
        for row in rows
    ]
    return envelope(data, snapshot_run_id=snapshot_run_id, refreshed_at=refreshed_at, count=len(data), limit=limit, offset=offset)
