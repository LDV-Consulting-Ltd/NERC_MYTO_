"""
GridSight product surfaces: manifest, knowledge assets, entities, relationships, signals.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.schemas import envelope
from app.db import get_db
from app.services.product_entities import build_entities
from app.services.product_knowledge_assets import build_knowledge_assets
from app.services.product_manifest import build_product_manifest
from app.services.product_relationships import build_relationships
from app.services.product_signals import build_signals

router = APIRouter(tags=["Product"])


@router.get("/manifest")
async def get_product_manifest():
    """
    GridSight product manifest (v0.1) for connector registration and discovery.
    Static metadata only; does not query the database or invoke ETL.
    """
    manifest = build_product_manifest()
    return envelope(manifest.model_dump(), count=1)


@router.get("/knowledge-assets")
async def get_knowledge_assets():
    """
    GridSight knowledge assets (v0.1): evidence-backed glossaries, policies, lineage,
    and documentation references. Read-only; no DB writes or ETL.
    """
    payload = build_knowledge_assets()
    return envelope(payload.model_dump(), count=len(payload.assets))


@router.get("/entities")
async def get_entities():
    """
    GridSight entity surface (v0.1): evidence-backed entity type catalog with stable ID patterns.
    Type summaries only; instance data via backing_api endpoints. No DB writes or ETL.
    """
    payload = build_entities()
    return envelope(payload.model_dump(), count=len(payload.entities))


@router.get("/relationships")
async def get_relationships():
    """
    GridSight relationship surface (v0.1): evidence-backed table relationships from
    lineage registry, gold FKs, governance lineage, and snapshot promotion.
    No DB writes, ETL, or graph database.
    """
    payload = build_relationships()
    return envelope(payload.model_dump(), count=len(payload.relationships))


@router.get("/signals")
async def get_signals(db: AsyncSession = Depends(get_db)):
    """
    GridSight rule-based signals (v0.1): operational metrics that may require attention.
    Read-only DB queries only; no writes, ETL, AI, or forecasting.
    """
    payload = await build_signals(db)
    return envelope(payload.model_dump(), count=len(payload.signals))
