"""
Lineage API: GET /v1/lineage/graph for interactive lineage diagram.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.api.schemas import envelope
from app.lineage.catalog_data import get_catalog_tables_static
from app.lineage.builder import build_graph

router = APIRouter(tags=["Lineage"])


@router.get("/graph")
async def lineage_graph(
    mode: str = "latest",
    run_id: str | None = None,
    dataset: str | None = None,
    layer: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Returns lineage graph: nodes (tables) and edges (transform inputs/outputs).
    mode: latest | run. When run, pass run_id to tag edges (if runtime logs exist).
    dataset / layer filter which nodes are included.
    """
    catalog_tables = get_catalog_tables_static()
    # Optionally enrich catalog with row counts (same as catalog/tables)
    if db:
        allowed = {"bronze", "silver", "gold", "latest"}
        for t in catalog_tables:
            name = t.get("name") or t.get("id")
            if not name or name.startswith("source.") or "." not in name:
                continue
            parts = name.split(".", 1)
            if len(parts) != 2 or parts[0] not in allowed:
                continue
            try:
                from sqlalchemy import text
                r = await db.execute(text(f'SELECT count(*) FROM "{parts[0]}"."{parts[1]}"'))
                row = r.scalar()
                if row is not None:
                    t["rowCount"] = row[0] if isinstance(row, (list, tuple)) else row
            except Exception:
                pass
    result = build_graph(
        catalog_tables,
        mode=mode,
        run_id=run_id,
        dataset=dataset,
        layer=layer,
    )
    return envelope(result, count=len(result.get("nodes", [])) + len(result.get("edges", [])))
