"""
GridSight Entity surface (v0.1).

Evidence-backed entity type catalog for connector registration.
Type summaries only in v0.1; instance enumeration via backing APIs (read-only).
No DB writes, ETL, or schema changes.
"""
from __future__ import annotations

from datetime import datetime, timezone

from pydantic import BaseModel, Field

ENTITIES_VERSION = "0.1"

ALLOWED_ENTITY_TYPES = [
    "Disco",
    "Feeder",
    "Location",
    "Period",
    "Supply Commitment",
    "PDF Document",
    "ETL Run",
]

FORBIDDEN_ENTITY_TYPES = [
    "substation",
    "customer",
    "transformer",
    "meter",
    "outage",
]


class GridSightEntity(BaseModel):
    entity_id: str
    entity_type: str
    entity_name: str
    description: str
    source_layer: str
    backing_table: str
    backing_api: str | None = None
    attributes: dict
    evidence: list[str] = Field(default_factory=list)
    confidence: str
    status: str
    limitations: list[str] = Field(default_factory=list)


class EntitiesResponse(BaseModel):
    product_id: str = "gridsight"
    entities_version: str = ENTITIES_VERSION
    generated_at: str
    entities: list[GridSightEntity]
    instance_access: dict = Field(default_factory=dict)
    warnings: list[str] = Field(default_factory=list)


def _entity_type_definitions() -> list[GridSightEntity]:
    """Static entity type summaries derived from existing models and APIs."""
    return [
        GridSightEntity(
            entity_id="gridsight:entity:type:disco",
            entity_type="Disco",
            entity_name="Distribution Company (DisCo)",
            description="Nigerian distribution company identified by disco_code from MYTO PDF titles.",
            source_layer="gold",
            backing_table="gold.dim_disco",
            backing_api="/v1/latest/discos",
            attributes={
                "stable_instance_id_pattern": "gridsight:entity:disco:{disco_code}",
                "natural_key": "disco_code",
                "surrogate_key": "disco_key",
                "fields": {
                    "disco_key": "integer surrogate key",
                    "disco_code": "text code (first token from MYTO title)",
                    "disco_name": "optional display name",
                },
            },
            evidence=[
                "gold.dim_disco in models/gold.py",
                "GET /v1/latest/discos",
                "silver.service_level_commitments.disco_code",
            ],
            confidence="definition",
            status="type_summary",
            limitations=[
                "v0.1 returns type summary only; list instances via GET /v1/latest/discos.",
                "disco_name may be null in gold.dim_disco.",
            ],
        ),
        GridSightEntity(
            entity_id="gridsight:entity:type:feeder",
            entity_type="Feeder",
            entity_name="Feeder",
            description="Electricity feeder within a DisCo, scoped by feeder_name and band.",
            source_layer="gold",
            backing_table="gold.dim_feeder",
            backing_api="/v1/latest/feeders",
            attributes={
                "stable_instance_id_pattern": "gridsight:entity:feeder:{feeder_key}",
                "natural_key": "feeder_name + band + disco_key",
                "surrogate_key": "feeder_key",
                "fields": {
                    "feeder_key": "integer surrogate key",
                    "disco_key": "foreign key to gold.dim_disco",
                    "feeder_name": "text feeder name from SLC table",
                    "band": "tariff band",
                },
            },
            evidence=[
                "gold.dim_feeder in models/gold.py",
                "GET /v1/latest/feeders",
                "GET /v1/latest/feeder/{feeder_key}",
            ],
            confidence="definition",
            status="type_summary",
            limitations=[
                "v0.1 returns type summary only; instances via GET /v1/latest/feeders.",
                "Merge/split feeder admin overrides are not implemented.",
            ],
        ),
        GridSightEntity(
            entity_id="gridsight:entity:type:location",
            entity_type="Location",
            entity_name="Geocoded Location",
            description="Normalized feeder location with optional lat/lon and geometry from geocoding.",
            source_layer="gold",
            backing_table="gold.dim_location",
            backing_api="/v1/latest/search",
            attributes={
                "stable_instance_id_pattern": "gridsight:entity:location:{location_key}",
                "natural_key": "location_text_norm",
                "surrogate_key": "location_key",
                "fields": {
                    "location_key": "integer surrogate key",
                    "location_text_norm": "normalized location text",
                    "lat": "latitude",
                    "lon": "longitude",
                    "geom": "PostGIS point geography",
                    "provider": "geocode provider name",
                    "confidence": "geocode confidence score",
                },
            },
            evidence=[
                "gold.dim_location in models/gold.py",
                "silver.service_level_commitments_geo.location_text_norm",
                "GET /v1/latest/search (feeder_location)",
                "GET /v1/latest/feeder/{feeder_key} (locations array)",
            ],
            confidence="definition",
            status="type_summary",
            limitations=[
                "v0.1 returns type summary only; no dedicated /v1/latest/locations list endpoint.",
                "Geocode coverage depends on pipeline geocoding stage.",
            ],
        ),
        GridSightEntity(
            entity_id="gridsight:entity:type:period",
            entity_type="Period",
            entity_name="Reporting Period",
            description="Year and month period derived from MYTO PDF metadata.",
            source_layer="gold",
            backing_table="gold.dim_date",
            backing_api="/v1/latest/months",
            attributes={
                "stable_instance_id_pattern": "gridsight:entity:period:{date_key}",
                "natural_key": "year + month_name",
                "surrogate_key": "date_key",
                "fields": {
                    "date_key": "integer YYYYMM-style key",
                    "year": "integer year",
                    "month": "integer month number",
                    "month_name": "text month name from source PDF",
                },
            },
            evidence=[
                "gold.dim_date in models/gold.py",
                "GET /v1/latest/months",
                "bronze.pdf_registry.year, month_name",
            ],
            confidence="definition",
            status="type_summary",
            limitations=[
                "v0.1 returns type summary only; periods listed via GET /v1/latest/months.",
            ],
        ),
        GridSightEntity(
            entity_id="gridsight:entity:type:supply_commitment",
            entity_type="Supply Commitment",
            entity_name="Service Level Commitment",
            description="Minimum supply hours commitment for a feeder/location in a reporting period.",
            source_layer="silver",
            backing_table="silver.service_level_commitments",
            backing_api="/v1/latest/commitments",
            attributes={
                "stable_instance_id_pattern": (
                    "gridsight:entity:supply_commitment:"
                    "{run_id}:{disco_code}:{year}:{month_name}:{band}:{feeder_name}:{feeder_location}"
                ),
                "composite_key": [
                    "run_id",
                    "disco_code",
                    "month_name",
                    "year",
                    "band",
                    "feeder_name",
                    "feeder_location",
                ],
                "fields": {
                    "min_supply_hours": "numeric commitment value",
                    "major_users": "optional major users text",
                    "source_pdf_url": "provenance PDF URL",
                    "source_page_no": "source page in PDF",
                    "source_table_index": "source table index on page",
                },
                "geo_table": "silver.service_level_commitments_geo",
                "latest_table": "silver.service_level_commitments_geo_latest",
                "gold_fact": "gold.fact_supply_commitment",
            },
            evidence=[
                "silver.service_level_commitments in models/silver.py",
                "silver.service_level_commitments_geo",
                "gold.fact_supply_commitment",
                "GET /v1/latest/commitments",
                "GET /v1/latest/search",
            ],
            confidence="definition",
            status="type_summary",
            limitations=[
                "v0.1 returns type summary only; instances via GET /v1/latest/commitments.",
                "Composite stable ID requires all key components; URL-encode feeder_location in clients.",
            ],
        ),
        GridSightEntity(
            entity_id="gridsight:entity:type:pdf_document",
            entity_type="PDF Document",
            entity_name="MYTO PDF Document",
            description="Discovered or downloaded NERC MYTO PDF source document per pipeline run.",
            source_layer="bronze",
            backing_table="bronze.pdf_registry",
            backing_api="/v1/layers/bronze/pdfs",
            attributes={
                "stable_instance_id_pattern": "gridsight:entity:pdf_document:{run_id}:{pdf_url}",
                "composite_key": ["run_id", "pdf_url"],
                "fields": {
                    "pdf_url": "primary key component",
                    "title": "card title from NERC list page",
                    "disco_code": "parsed DisCo code",
                    "month_name": "parsed month",
                    "year": "parsed year",
                    "download_url": "resolved download URL",
                    "status": "discovered/downloaded status",
                },
                "artifact_table": "bronze.pdf_artifact",
            },
            evidence=[
                "bronze.pdf_registry in models/bronze.py",
                "bronze.pdf_artifact",
                "GET /v1/layers/bronze/pdfs",
            ],
            confidence="definition",
            status="type_summary",
            limitations=[
                "v0.1 returns type summary only; scoped per run_id.",
                "Stable ID includes full pdf_url; hash if URL length is problematic in clients.",
            ],
        ),
        GridSightEntity(
            entity_id="gridsight:entity:type:etl_run",
            entity_type="ETL Run",
            entity_name="Pipeline Run",
            description="Single automated ELT pipeline execution with stages and events.",
            source_layer="bronze",
            backing_table="bronze.etl_run",
            backing_api="/v1/runs",
            attributes={
                "stable_instance_id_pattern": "gridsight:entity:etl_run:{run_id}",
                "surrogate_key": "run_id",
                "fields": {
                    "run_id": "UUID primary key",
                    "started_at": "run start timestamp",
                    "finished_at": "run finish timestamp",
                    "status": "running | success | failed",
                    "source_root_url": "MYTO list base URL",
                    "git_sha": "optional git SHA for reproducibility",
                    "heartbeat_at": "last heartbeat for stuck detection",
                },
                "related_tables": ["bronze.etl_stage", "bronze.etl_event"],
            },
            evidence=[
                "bronze.etl_run in models/bronze.py",
                "GET /v1/runs",
                "GET /v1/runs/{run_id}",
            ],
            confidence="definition",
            status="type_summary",
            limitations=[
                "v0.1 returns type summary only; instances via GET /v1/runs.",
                "Does not enumerate stage/event payloads in entity surface.",
            ],
        ),
    ]


def build_entities() -> EntitiesResponse:
    """
    Build GridSight entity catalog (type summaries).
    Pure function: no DB, ETL, or file I/O.
    """
    entities = _entity_type_definitions()
    return EntitiesResponse(
        generated_at=datetime.now(timezone.utc).isoformat(),
        entities=entities,
        instance_access={
            "mode": "type_summary_only",
            "description": (
                "v0.1 exposes entity type definitions with stable ID patterns. "
                "Query instances read-only via backing_api endpoints listed on each entity."
            ),
            "backing_apis": {
                "Disco": "/v1/latest/discos",
                "Feeder": "/v1/latest/feeders",
                "Location": "/v1/latest/search",
                "Period": "/v1/latest/months",
                "Supply Commitment": "/v1/latest/commitments",
                "PDF Document": "/v1/layers/bronze/pdfs",
                "ETL Run": "/v1/runs",
            },
        },
        warnings=[
            "Entity instances are not enumerated in v0.1; use backing_api per entity type.",
        ],
    )
