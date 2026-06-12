"""
GridSight Tanna connector router.

Mounted at /api/v1/tanna. All routes require Authorization: Bearer <TANNA_CONNECTOR_TOKEN>.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.schemas import envelope
from app.db import get_db
from app.services.product_entities import build_entities
from app.services.product_knowledge_assets import build_knowledge_assets
from app.services.product_relationships import build_relationships
from app.services.product_signals import build_signals
from app.tanna_connector.auth import require_tanna_token
from app.tanna_connector.service import (
    build_not_implemented_payload,
    build_tanna_data_products,
    build_tanna_health,
    build_tanna_manifest,
    build_tanna_status,
)

router = APIRouter(tags=["Tanna"], dependencies=[Depends(require_tanna_token)])


@router.get("/manifest")
async def tanna_manifest():
    data = build_tanna_manifest()
    return envelope(data, count=1)


@router.get("/health")
async def tanna_health():
    data = await build_tanna_health()
    return envelope(data, count=1)


@router.get("/status")
async def tanna_status(db: AsyncSession = Depends(get_db)):
    data = await build_tanna_status(db)
    return envelope(data, count=1)


@router.get("/data-products")
async def tanna_data_products():
    payload = build_tanna_data_products()
    return envelope(payload, count=payload["count"])


@router.get("/entities")
async def tanna_entities():
    payload = build_entities()
    return envelope(payload.model_dump(), count=len(payload.entities))


@router.get("/relationships")
async def tanna_relationships():
    payload = build_relationships()
    return envelope(payload.model_dump(), count=len(payload.relationships))


@router.get("/signals")
async def tanna_signals(db: AsyncSession = Depends(get_db)):
    payload = await build_signals(db)
    return envelope(payload.model_dump(), count=len(payload.signals))


@router.get("/patterns")
async def tanna_patterns():
    payload = build_not_implemented_payload("patterns")
    return envelope(payload, count=0)


@router.get("/illuminations")
async def tanna_illuminations():
    payload = build_not_implemented_payload("illuminations")
    return envelope(payload, count=0)


@router.get("/decision-products")
async def tanna_decision_products():
    payload = build_not_implemented_payload("decision_products")
    return envelope(payload, count=0)


@router.get("/knowledge-assets")
async def tanna_knowledge_assets():
    payload = build_knowledge_assets()
    return envelope(payload.model_dump(), count=len(payload.assets))
