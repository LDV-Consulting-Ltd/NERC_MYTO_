import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.db import engine
from app.api.routes import (
    healthz as healthz_router,
    health,
    runs,
    exports,
    scheduler,
    metadata,
    dq,
    metrics,
    governance,
    admin,
    tenants,
    agent,
    latest,
    layers,
    lineage,
    catalog,
    product,
    debug as debug_router,
)
from app.tanna_connector.router import router as tanna_connector_router
# Optional: from app.api.middleware import RateLimitMiddleware, APIKeyMiddleware


def _mask_db_url(url: str) -> str:
    """Return database URL with password masked for logging."""
    if "@" in url and ":" in url:
        try:
            pre, rest = url.split("@", 1)
            if "//" in pre:
                scheme, rest2 = pre.split("//", 1)
                if ":" in rest2:
                    user, _ = rest2.split(":", 1)
                    return f"{scheme}//{user}:****@{rest}"
            return "****@..."
        except Exception:
            return "****"
    return "****"


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    logging.info(
        "Backend starting: database_host=%s",
        _mask_db_url(settings.database_url),
    )
    logging.info("App routes loaded (health, runs, layers, latest, metadata, dq, metrics, ...)")
    yield
    await engine.dispose()


app = FastAPI(
    title="MYTO Platform API",
    description="Production-grade data product API. All endpoints under /v1. Envelope: { data, meta }.",
    version="1.0.0",
    lifespan=lifespan,
    openapi_tags=[
        {"name": "Health"},
        {"name": "Runs"},
        {"name": "Debug"},
        {"name": "Layers"},
        {"name": "Metadata"},
        {"name": "DQ"},
        {"name": "Metrics"},
        {"name": "Governance"},
        {"name": "Latest"},
        {"name": "Exports"},
        {"name": "Scheduler"},
        {"name": "Admin"},
        {"name": "Tenants"},
        {"name": "Agent"},
        {"name": "Lineage"},
        {"name": "Catalog"},
        {"name": "Product"},
        {"name": "Tanna"},
    ],
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://host.docker.internal:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# app.add_middleware(RateLimitMiddleware)
# app.add_middleware(APIKeyMiddleware)

app.include_router(healthz_router.router, prefix="/v1", tags=["Health"])
app.include_router(health.router, prefix="/v1", tags=["Health"])
app.include_router(runs.router, prefix="/v1/runs", tags=["Runs"])
app.include_router(layers.router, prefix="/v1/layers", tags=["Layers"])
app.include_router(latest.router, prefix="/v1/latest", tags=["Latest"])
app.include_router(metadata.router, prefix="/v1/metadata", tags=["Metadata"])
app.include_router(dq.router, prefix="/v1/dq", tags=["DQ"])
app.include_router(metrics.router, prefix="/v1/metrics", tags=["Metrics"])
app.include_router(governance.router, prefix="/v1/governance", tags=["Governance"])
app.include_router(exports.router, prefix="/v1/exports", tags=["Exports"])
app.include_router(scheduler.router, prefix="/v1/scheduler", tags=["Scheduler"])
app.include_router(admin.router, prefix="/v1/admin", tags=["Admin"])
app.include_router(tenants.router, prefix="/v1/tenants", tags=["Tenants"])
app.include_router(agent.router, prefix="/v1/agent", tags=["Agent"])
app.include_router(lineage.router, prefix="/v1/lineage", tags=["Lineage"])
app.include_router(catalog.router, prefix="/v1/catalog", tags=["Catalog"])
app.include_router(product.router, prefix="/v1/product", tags=["Product"])
app.include_router(tanna_connector_router, prefix="/api/v1/tanna", tags=["Tanna"])
app.include_router(debug_router.router, prefix="/v1", tags=["Debug"])


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logging.exception("Unhandled exception: %s", exc)
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "path": request.url.path},
    )
