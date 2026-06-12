"""
Tanna connector payloads — delegates to existing GridSight product surfaces.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.routes.metadata import DATASETS
from app.config import get_settings
from app.db import engine
from app.services.product_entities import build_entities
from app.services.product_knowledge_assets import build_knowledge_assets
from app.services.product_manifest import build_product_manifest
from app.services.product_relationships import build_relationships
from app.services.product_signals import build_signals


CONNECTOR_VERSION = "0.1"
NOT_IMPLEMENTED_OBJECTS = ("patterns", "illuminations", "decision_products")


def build_tanna_manifest() -> dict:
    product = build_product_manifest()
    return {
        "module_id": "gridsight",
        "module_name": "GridSight",
        "connector_version": CONNECTOR_VERSION,
        "base_path": "/api/v1/tanna",
        "product_id": product.product_id,
        "product_name": product.product_name,
        "product_category": product.product_category,
        "owner": product.owner,
        "legacy_aliases": product.legacy_aliases,
        "supported_capabilities": product.supported_capabilities,
        "unsupported_capabilities": product.unsupported_capabilities,
        "supported_data_layers": product.supported_data_layers,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


async def build_tanna_health() -> dict:
    db_status = "ok"
    error = None
    try:
        async with asyncio.timeout(2.0):
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
    except Exception as exc:
        db_status = "down"
        error = str(exc)
    return {
        "status": "ok" if db_status == "ok" else "degraded",
        "connector": "ok",
        "db": db_status,
        "error": error,
        "time": datetime.now(timezone.utc).isoformat(),
    }


async def build_tanna_status(db: AsyncSession) -> dict:
    settings = get_settings()
    r = await db.execute(text("SELECT run_id, status FROM bronze.etl_run WHERE status = 'running' LIMIT 1"))
    running = r.first()
    r2 = await db.execute(
        text(
            "SELECT run_id, finished_at FROM bronze.etl_run "
            "WHERE status = 'success' ORDER BY finished_at DESC LIMIT 1"
        )
    )
    last = r2.first()
    return {
        "module_id": "gridsight",
        "connector_version": CONNECTOR_VERSION,
        "token_configured": bool(settings.tanna_connector_token),
        "pipeline_running": running is not None,
        "running_run_id": str(running[0]) if running else None,
        "last_success_run_id": str(last[0]) if last else None,
        "last_success_finished_at": (
            last[1].isoformat() if last and last[1] and hasattr(last[1], "isoformat") else None
        ),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


def build_tanna_data_products() -> dict:
    products = []
    for ds in DATASETS:
        products.append(
            {
                "data_product_id": f"gridsight:data_product:{ds['name'].replace('.', '_')}",
                "name": ds["name"],
                "layer": ds["layer"],
                "description": ds["description"],
                "backing_table": ds["name"],
            }
        )
    return {
        "module_id": "gridsight",
        "data_products": products,
        "count": len(products),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


def build_not_implemented_payload(object_type: str) -> dict:
    return {
        "module_id": "gridsight",
        "object_type": object_type,
        "implementation_status": "not_implemented",
        "items": [],
        "limitations": [
            f"{object_type} are not implemented in GridSight backend logic.",
            "See GET /api/v1/tanna/manifest unsupported_capabilities.",
        ],
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
