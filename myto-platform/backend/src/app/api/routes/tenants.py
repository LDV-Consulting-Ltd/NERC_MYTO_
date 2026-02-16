"""
Tenants: monetization scaffold. Stubs with stable schemas and contracts.
"""
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.schemas import envelope

router = APIRouter(tags=["Tenants"])

# In-memory stub storage (replace with DB)
_tenants = {}
_api_keys = {}


class TenantCreate(BaseModel):
    name: str
    slug: str | None = None


class ApiKeyCreate(BaseModel):
    name: str


@router.post("")
async def create_tenant(body: TenantCreate):
    tenant_id = str(uuid4())
    _tenants[tenant_id] = {"tenant_id": tenant_id, "name": body.name, "slug": body.slug or body.name.lower().replace(" ", "-")}
    return envelope(_tenants[tenant_id], count=1)


@router.get("")
async def list_tenants():
    data = list(_tenants.values())
    return envelope(data, count=len(data))


@router.get("/{tenant_id}")
async def get_tenant(tenant_id: str):
    if tenant_id not in _tenants:
        raise HTTPException(404, "Tenant not found")
    return envelope(_tenants[tenant_id], count=1)


@router.post("/{tenant_id}/keys")
async def create_tenant_key(tenant_id: str, body: ApiKeyCreate):
    if tenant_id not in _tenants:
        raise HTTPException(404, "Tenant not found")
    key_id = str(uuid4())
    api_key = f"myto_{uuid4().hex[:24]}"
    _api_keys[key_id] = {"key_id": key_id, "tenant_id": tenant_id, "name": body.name, "prefix": api_key[:12] + "..."}
    return envelope({"key_id": key_id, "api_key": api_key, "name": body.name}, count=1)


@router.get("/{tenant_id}/keys")
async def list_tenant_keys(tenant_id: str):
    if tenant_id not in _tenants:
        raise HTTPException(404, "Tenant not found")
    data = [v for k, v in _api_keys.items() if v["tenant_id"] == tenant_id]
    return envelope(data, count=len(data))


@router.delete("/{tenant_id}/keys/{key_id}")
async def delete_tenant_key(tenant_id: str, key_id: str):
    if tenant_id not in _tenants:
        raise HTTPException(404, "Tenant not found")
    if key_id not in _api_keys or _api_keys[key_id]["tenant_id"] != tenant_id:
        raise HTTPException(404, "Key not found")
    del _api_keys[key_id]
    return envelope({"status": "deleted"}, count=1)
