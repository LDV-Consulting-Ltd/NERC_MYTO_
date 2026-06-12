"""
GridSight product manifest (v0.1).

Static, code-defined manifest for connector registration. Does not touch DB or ETL.
"""
from datetime import datetime, timezone

from pydantic import BaseModel, Field

MANIFEST_VERSION = "0.1"

API_TITLE = "MYTO Platform API"
API_VERSION = "1.0.0"
OPENAPI_URL = "/openapi.json"

LEGACY_ALIASES = [
    "MYTO Platform",
    "URIP",
    "Utility Regulatory MYTO Intelligence Platform (URIP)",
    "NERC MYTO",
    "myto-platform",
    "myto-backend",
    "myto-platform-backend",
]

AVAILABLE_API_GROUPS = [
    "Health",
    "Runs",
    "Layers",
    "Latest",
    "Metadata",
    "DQ",
    "Metrics",
    "Governance",
    "Exports",
    "Scheduler",
    "Admin",
    "Tenants",
    "Agent",
    "Lineage",
    "Catalog",
    "Product",
    "Debug",
]

SUPPORTED_DOMAINS = [
    "NERC MYTO Service Level Commitments",
    "Distribution company (DisCo) supply commitments",
    "PDF discovery and extraction",
    "Geocoded feeder locations",
]

SUPPORTED_DATA_LAYERS = [
    "source",
    "bronze",
    "silver",
    "gold",
    "latest",
]

SUPPORTED_CAPABILITIES = [
    "health",
    "pipeline runs",
    "medallion data layers",
    "catalog tables",
    "metadata coverage",
    "metadata freshness",
    "DQ summary",
    "DQ rules",
    "lineage graph",
    "latest commitments",
    "latest map points",
    "CSV export",
    "scheduler status",
    "rule-based agent query",
    "knowledge_assets",
    "entity_surface",
    "relationship_surface",
    "rule_based_signals",
]

UNSUPPORTED_CAPABILITIES = [
    "Tanna connector",
    "pattern detection",
    "illuminations",
    "decision products",
    "LLM-powered agent",
    "parquet export",
    "feeder merge/split logic",
    "run-scoped transform persistence",
]

CURRENT_LIMITATIONS = [
    "Product manifest v0.1; legacy MYTO naming remains in API title and codebase.",
    "GET /v1/metadata/datasets/{name}/schema returns empty columns (no live introspection).",
    "Parquet export endpoint returns HTTP 501.",
    "Feeder merge/split admin overrides are stubs.",
    "No runtime transform_runs table for run-scoped lineage (see LINEAGE_README.md).",
    "Agent query is keyword rule-based, not LLM-powered.",
    "Tenants and API keys are in-memory stubs only.",
    "No external Nigerian gazetteer for geocoding (see MISSING_AMBIGUOUS.md).",
]

DOCUMENTATION_REFERENCES = [
    "README.md",
    "LINEAGE_README.md",
    "MISSING_AMBIGUOUS.md",
    "backend/docs/CRAWLER_FLOW_AND_BOTTLENECKS.md",
]


class ProductManifest(BaseModel):
    product_id: str = "gridsight"
    product_name: str = "GridSight"
    product_category: str = "Electricity & Utility Intelligence"
    manifest_version: str = MANIFEST_VERSION
    owner: str = "LDV"
    legacy_aliases: list[str] = Field(default_factory=lambda: list(LEGACY_ALIASES))
    api_title: str = API_TITLE
    api_version: str = API_VERSION
    openapi_url: str = OPENAPI_URL
    available_api_groups: list[str] = Field(default_factory=lambda: list(AVAILABLE_API_GROUPS))
    supported_domains: list[str] = Field(default_factory=lambda: list(SUPPORTED_DOMAINS))
    supported_data_layers: list[str] = Field(default_factory=lambda: list(SUPPORTED_DATA_LAYERS))
    supported_capabilities: list[str] = Field(default_factory=lambda: list(SUPPORTED_CAPABILITIES))
    unsupported_capabilities: list[str] = Field(default_factory=lambda: list(UNSUPPORTED_CAPABILITIES))
    current_limitations: list[str] = Field(default_factory=lambda: list(CURRENT_LIMITATIONS))
    documentation_references: list[str] = Field(default_factory=lambda: list(DOCUMENTATION_REFERENCES))
    generated_at: str


def build_product_manifest() -> ProductManifest:
    """Build manifest snapshot. Pure function; no I/O, DB, or ETL."""
    return ProductManifest(
        generated_at=datetime.now(timezone.utc).isoformat(),
    )
