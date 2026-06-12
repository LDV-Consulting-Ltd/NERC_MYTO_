"""
GridSight Relationship surface (v0.1).

Evidence-backed relationships from lineage registry, gold FKs, governance lineage,
and snapshot promotion. Static definitions only; no DB, ETL, or graph DB.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Callable

from pydantic import BaseModel, Field

from app.lineage.registry import TRANSFORM_REGISTRY

RELATIONSHIPS_VERSION = "0.1"

ALLOWED_RELATIONSHIP_TYPES = [
    "sourced_from",
    "derived_from",
    "produces",
    "references",
    "belongs_to",
    "contains",
    "documented_by",
    "represented_by",
    "latest_snapshot_of",
]

FORBIDDEN_RELATIONSHIP_PATTERNS = [
    ("feeder", "transformer"),
    ("customer", "meter"),
    ("outage", "feeder"),
    ("substation", "feeder"),
]


class GridSightRelationship(BaseModel):
    relationship_id: str
    relationship_type: str
    source_object_type: str
    source_object_id: str
    target_object_type: str
    target_object_id: str
    description: str
    evidence: list[str] = Field(default_factory=list)
    confidence: str
    status: str
    limitations: list[str] = Field(default_factory=list)


class RelationshipsResponse(BaseModel):
    product_id: str = "gridsight"
    relationships_version: str = RELATIONSHIPS_VERSION
    generated_at: str
    relationships: list[GridSightRelationship]
    evidence_sources: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


def _rel_id(source: str, rel_type: str, target: str) -> str:
    return f"gridsight:relationship:{source}:{rel_type}:{target}"


def _table_rel(
    source: str,
    rel_type: str,
    target: str,
    description: str,
    evidence: list[str],
    *,
    confidence: str = "high",
    status: str = "defined",
    limitations: list[str] | None = None,
) -> GridSightRelationship:
    return GridSightRelationship(
        relationship_id=_rel_id(source, rel_type, target),
        relationship_type=rel_type,
        source_object_type="table",
        source_object_id=source,
        target_object_type="table",
        target_object_id=target,
        description=description,
        evidence=evidence,
        confidence=confidence,
        status=status,
        limitations=limitations or [],
    )


def _lineage_registry_produces() -> list[GridSightRelationship]:
    """Produces edges from TRANSFORM_REGISTRY (excluding promote_latest outputs)."""
    relationships: list[GridSightRelationship] = []
    skip_transforms = {"promote_latest"}
    for transform in TRANSFORM_REGISTRY:
        if transform["transform_name"] in skip_transforms:
            continue
        for src in transform["inputs"]:
            for tgt in transform["outputs"]:
                relationships.append(
                    _table_rel(
                        src,
                        "produces",
                        tgt,
                        f"Transform '{transform['transform_name']}' reads {src} and writes {tgt}.",
                        [
                            f"TRANSFORM_REGISTRY transform_name={transform['transform_name']}",
                            "lineage/registry.py",
                            "lineage/builder.py build_edges_from_registry",
                            "GET /v1/lineage/graph",
                        ],
                    )
                )
    return relationships


def _latest_snapshot_relationships() -> list[GridSightRelationship]:
    return [
        _table_rel(
            "silver.service_level_commitments_geo",
            "latest_snapshot_of",
            "silver.service_level_commitments_geo_latest",
            "Latest silver geo snapshot is promoted from per-run geo table.",
            [
                "TRANSFORM_REGISTRY transform_name=promote_latest",
                "lineage/registry.py",
                "GET /v1/lineage/graph",
                "GET /v1/governance/policies snapshot_policy",
            ],
        ),
        _table_rel(
            "gold.fact_supply_commitment",
            "latest_snapshot_of",
            "gold.fact_supply_commitment_latest",
            "Latest gold fact snapshot is promoted from per-run fact table.",
            [
                "TRANSFORM_REGISTRY transform_name=promote_latest",
                "lineage/registry.py",
                "GET /v1/lineage/graph",
                "GET /v1/governance/policies snapshot_policy",
            ],
        ),
    ]


def _gold_foreign_key_relationships() -> list[GridSightRelationship]:
    fk_evidence = "models/gold.py ForeignKey definition"
    return [
        _table_rel(
            "gold.dim_feeder",
            "belongs_to",
            "gold.dim_disco",
            "Feeder dimension rows reference a DisCo via disco_key.",
            [fk_evidence, "gold.dim_feeder.disco_key -> gold.dim_disco.disco_key"],
        ),
        _table_rel(
            "gold.fact_supply_commitment",
            "references",
            "gold.dim_disco",
            "Supply commitment fact references DisCo dimension via disco_key.",
            [fk_evidence, "gold.fact_supply_commitment.disco_key -> gold.dim_disco.disco_key"],
        ),
        _table_rel(
            "gold.fact_supply_commitment",
            "references",
            "gold.dim_feeder",
            "Supply commitment fact references feeder dimension via feeder_key.",
            [fk_evidence, "gold.fact_supply_commitment.feeder_key -> gold.dim_feeder.feeder_key"],
        ),
        _table_rel(
            "gold.fact_supply_commitment",
            "references",
            "gold.dim_location",
            "Supply commitment fact references location dimension via location_key.",
            [fk_evidence, "gold.fact_supply_commitment.location_key -> gold.dim_location.location_key"],
        ),
        _table_rel(
            "gold.fact_supply_commitment",
            "references",
            "gold.dim_date",
            "Supply commitment fact references reporting period via date_key.",
            [fk_evidence, "gold.fact_supply_commitment.date_key -> gold.dim_date.date_key"],
        ),
    ]


def _governance_lineage_relationships() -> list[GridSightRelationship]:
    """Metric lineage path from GET /v1/governance/lineage."""
    return [
        _table_rel(
            "gold.fact_supply_commitment",
            "derived_from",
            "silver.service_level_commitments_geo",
            "min_supply_hours metric lineage: gold fact derived from silver geo commitments.",
            [
                "GET /v1/governance/lineage paths[0].gold/silver",
                "static registry definition in governance.py",
            ],
        ),
        _table_rel(
            "silver.service_level_commitments_geo",
            "derived_from",
            "bronze.pdf_table_raw",
            "min_supply_hours metric lineage: silver geo derived from bronze raw tables.",
            [
                "GET /v1/governance/lineage paths[0].silver/bronze",
                "static registry definition in governance.py",
            ],
        ),
        _table_rel(
            "bronze.pdf_table_raw",
            "sourced_from",
            "source.myto_list",
            "Raw extracted tables trace to NERC MYTO list source via discover/extract pipeline.",
            [
                "GET /v1/governance/lineage paths[0].source pdf_url, page_no",
                "TRANSFORM_REGISTRY discover + extract",
                "GET /v1/lineage/graph",
            ],
            limitations=["Provenance uses pdf_url/page_no fields, not a direct FK to source.myto_list."],
        ),
    ]


def _source_traceability_relationships() -> list[GridSightRelationship]:
    """Column-level traceability fields documented as table references."""
    trace_evidence = "source_pdf_url, source_page_no columns on silver/gold models"
    return [
        _table_rel(
            "silver.service_level_commitments",
            "references",
            "bronze.pdf_registry",
            "SLC rows reference source PDF via source_pdf_url (matches pdf_registry.pdf_url within run).",
            [
                trace_evidence,
                "models/silver.py ServiceLevelCommitments",
                "models/bronze.py PdfRegistry",
            ],
            confidence="medium",
            limitations=["Logical reference by pdf_url + run_id, not declared SQL FK."],
        ),
        _table_rel(
            "silver.service_level_commitments_geo",
            "references",
            "bronze.pdf_registry",
            "Geo SLC rows inherit source_pdf_url provenance from silver transform.",
            [
                trace_evidence,
                "models/silver.py ServiceLevelCommitmentsGeo",
            ],
            confidence="medium",
            limitations=["Logical reference by pdf_url + run_id, not declared SQL FK."],
        ),
        _table_rel(
            "gold.fact_supply_commitment",
            "references",
            "bronze.pdf_registry",
            "Gold fact rows retain source_pdf_url and source_page_no from silver pipeline.",
            [
                trace_evidence,
                "models/gold.py FactSupplyCommitment",
            ],
            confidence="medium",
            limitations=["Logical reference by pdf_url + run_id, not declared SQL FK."],
        ),
    ]


def _bronze_run_containment_relationships() -> list[GridSightRelationship]:
    fk_evidence = "models/bronze.py ForeignKey run_id -> bronze.etl_run"
    return [
        _table_rel(
            "bronze.etl_run",
            "contains",
            "bronze.etl_stage",
            "Each pipeline run contains per-stage status rows.",
            [fk_evidence, "bronze.etl_stage.run_id FK"],
        ),
        _table_rel(
            "bronze.etl_run",
            "contains",
            "bronze.etl_event",
            "Each pipeline run contains stage event logs.",
            [fk_evidence, "bronze.etl_event.run_id FK"],
        ),
        _table_rel(
            "bronze.etl_run",
            "contains",
            "bronze.pdf_registry",
            "Each pipeline run contains discovered PDF registry entries.",
            [fk_evidence, "bronze.pdf_registry.run_id FK"],
        ),
    ]


def build_relationships() -> RelationshipsResponse:
    """Build relationship catalog from static evidence. No DB or ETL."""
    builders: list[Callable[[], list[GridSightRelationship]]] = [
        _lineage_registry_produces,
        _latest_snapshot_relationships,
        _gold_foreign_key_relationships,
        _governance_lineage_relationships,
        _source_traceability_relationships,
        _bronze_run_containment_relationships,
    ]
    relationships: list[GridSightRelationship] = []
    seen_ids: set[str] = set()
    for builder in builders:
        for rel in builder():
            if rel.relationship_id in seen_ids:
                continue
            seen_ids.add(rel.relationship_id)
            relationships.append(rel)

    relationships.sort(key=lambda r: r.relationship_id)

    return RelationshipsResponse(
        generated_at=datetime.now(timezone.utc).isoformat(),
        relationships=relationships,
        evidence_sources=[
            "lineage/registry.py TRANSFORM_REGISTRY",
            "lineage/builder.py",
            "GET /v1/lineage/graph",
            "GET /v1/governance/lineage",
            "GET /v1/governance/policies",
            "models/gold.py ForeignKey definitions",
            "models/silver.py source traceability columns",
            "models/bronze.py run_id ForeignKey definitions",
        ],
        warnings=[
            "v0.1 defines table-level relationships only; instance-level edges require backing APIs.",
            "Logical pdf_registry references use source_pdf_url, not SQL FK.",
        ],
    )
