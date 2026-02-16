"""
Catalog API: tables for lineage and discovery. GET /v1/catalog/tables.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.db import get_db
from app.api.schemas import envelope
from app.lineage.catalog_data import get_catalog_tables_static

router = APIRouter(tags=["Catalog"])


@router.get("/tables")
async def list_tables(
    db: AsyncSession = Depends(get_db),
    layer: str | None = None,
    dataset: str | None = None,
):
    """
    List catalog tables for lineage and filtering.
    Returns displayName, layer, dataset, lastUpdated, rowCount when available.
    """
    tables = get_catalog_tables_static()
    if layer:
        tables = [t for t in tables if (t.get("layer") or "").lower() == layer.lower()]
    if dataset:
        tables = [t for t in tables if (t.get("dataset") or "").lower() == dataset.lower()]
    # Optional: enrich with row counts from DB (allowlist of schema.table only)
    if db:
        allowed = {"bronze", "silver", "gold", "latest"}
        try:
            for t in tables:
                name = t.get("name") or t.get("id")
                if not name or name.startswith("source.") or "." not in name:
                    continue
                schema, table = name.split(".", 1)
                if schema not in allowed or not table.replace("_", "").isalnum():
                    continue
                try:
                    r = await db.execute(text(f'SELECT count(*) FROM "{schema}"."{table}"'))
                    row = r.scalar()
                    if row is not None:
                        t["rowCount"] = row[0] if isinstance(row, (list, tuple)) else row
                except Exception:
                    pass
        except Exception:
            pass
    return envelope(tables, count=len(tables))
