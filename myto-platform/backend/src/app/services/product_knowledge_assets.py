"""
GridSight Knowledge Assets (v0.1).

Aggregates evidence-backed knowledge from existing code constants and repository docs.
Read-only: no DB, ETL, or file writes.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field

from app.api.routes.dq import DQ_RULES
from app.api.routes.metadata import COLUMN_DICTIONARY, DATASETS
from app.lineage.builder import build_graph
from app.lineage.catalog_data import get_catalog_tables_static

KNOWLEDGE_ASSETS_VERSION = "0.1"
PREVIEW_MAX_LEN = 240

RELATED_ENTITIES = [
    "disco",
    "feeder",
    "location",
    "period",
    "supply_commitment",
    "pdf_document",
    "etl_run",
]

GOVERNANCE_POLICIES: dict[str, str] = {
    "snapshot_policy": "Latest snapshot updated on successful run promote (atomic truncate+insert).",
    "retention_policy": "Run history retained; configure per environment.",
    "reproducibility": "run_id + git_sha + stage meta for traceability.",
}

EXPECTED_DOC_PATHS = [
    "README.md",
    "LINEAGE_README.md",
    "MISSING_AMBIGUOUS.md",
    "backend/docs/CRAWLER_FLOW_AND_BOTTLENECKS.md",
    "frontend/src/lib/diagrams.ts",
]


class KnowledgeAsset(BaseModel):
    asset_id: str
    asset_type: str
    title: str
    description: str
    source_path: str
    source_endpoint: str | None = None
    content_available: bool
    content_preview: str | None = None
    related_data_products: list[str] = Field(default_factory=list)
    related_entities: list[str] = Field(default_factory=list)
    evidence: list[str] = Field(default_factory=list)
    status: str
    limitations: list[str] = Field(default_factory=list)


class KnowledgeAssetsResponse(BaseModel):
    product_id: str = "gridsight"
    knowledge_assets_version: str = KNOWLEDGE_ASSETS_VERSION
    generated_at: str
    assets: list[KnowledgeAsset]
    warnings: list[str] = Field(default_factory=list)


def _repo_root() -> Path:
    # backend/src/app/services -> parents[4] == myto-platform
    return Path(__file__).resolve().parents[4]


def _preview(text: str | None) -> str | None:
    if not text:
        return None
    cleaned = " ".join(text.split())
    if len(cleaned) <= PREVIEW_MAX_LEN:
        return cleaned
    return cleaned[: PREVIEW_MAX_LEN - 3].rstrip() + "..."


def _read_doc(relative_path: str) -> tuple[bool, str | None]:
    path = _repo_root() / relative_path
    if not path.is_file():
        return False, None
    try:
        return True, path.read_text(encoding="utf-8")
    except OSError:
        return False, None


def _dataset_names() -> list[str]:
    return [d["name"] for d in DATASETS]


def _column_dictionary_asset() -> KnowledgeAsset:
    preview_source = json.dumps(COLUMN_DICTIONARY[:2], ensure_ascii=False)
    return KnowledgeAsset(
        asset_id="column_dictionary.slc_geo_latest",
        asset_type="column_dictionary",
        title="Service Level Commitments column dictionary",
        description="Business definitions for columns on silver.service_level_commitments_geo_latest.",
        source_path="backend/src/app/api/routes/metadata.py",
        source_endpoint="/v1/metadata/columns/dictionary",
        content_available=True,
        content_preview=_preview(preview_source),
        related_data_products=["silver.service_level_commitments_geo_latest"],
        related_entities=["disco", "feeder", "location", "supply_commitment"],
        evidence=[
            "COLUMN_DICTIONARY constant in metadata.py",
            "GET /v1/metadata/columns/dictionary",
        ],
        status="available",
        limitations=[
            "Covers eight columns only; not full table schema.",
            "Does not include bronze/gold column definitions.",
        ],
    )


def _dataset_catalog_asset() -> KnowledgeAsset:
    preview_source = json.dumps(DATASETS[:3], ensure_ascii=False)
    return KnowledgeAsset(
        asset_id="dataset_catalog.medallion",
        asset_type="dataset_catalog",
        title="Medallion dataset catalog",
        description="Registered datasets across bronze, silver, gold, and latest layers.",
        source_path="backend/src/app/api/routes/metadata.py",
        source_endpoint="/v1/metadata/datasets",
        content_available=True,
        content_preview=_preview(preview_source),
        related_data_products=_dataset_names(),
        related_entities=["disco", "feeder", "location", "supply_commitment", "pdf_document", "etl_run"],
        evidence=[
            "DATASETS constant in metadata.py",
            "GET /v1/metadata/datasets",
        ],
        status="available",
        limitations=[
            "OCR/signature tables in DB are not listed in DATASETS.",
            "GET /v1/metadata/datasets/{name}/schema returns empty columns.",
        ],
    )


def _dq_rule_assets() -> list[KnowledgeAsset]:
    assets: list[KnowledgeAsset] = []
    for rule in DQ_RULES:
        assets.append(
            KnowledgeAsset(
                asset_id=f"dq_rule.{rule['rule_id']}",
                asset_type="dq_rule",
                title=rule["name"],
                description=rule["definition"],
                source_path="backend/src/app/api/routes/dq.py",
                source_endpoint="/v1/dq/rules",
                content_available=True,
                content_preview=_preview(rule["definition"]),
                related_data_products=["silver.service_level_commitments_dq"],
                related_entities=["supply_commitment", "disco", "period"],
                evidence=[
                    f"DQ_RULES rule_id={rule['rule_id']} in dq.py",
                    "GET /v1/dq/rules",
                    "services/validation.py dq_status_for_slc_row",
                ],
                status="available",
                limitations=["Rule outcomes stored per run in silver.service_level_commitments_dq."],
            )
        )
    return assets


def _governance_policy_assets() -> list[KnowledgeAsset]:
    assets: list[KnowledgeAsset] = []
    titles = {
        "snapshot_policy": "Snapshot promotion policy",
        "retention_policy": "Run retention policy",
        "reproducibility": "Pipeline reproducibility policy",
    }
    for key, value in GOVERNANCE_POLICIES.items():
        assets.append(
            KnowledgeAsset(
                asset_id=f"governance_policy.{key}",
                asset_type="governance_policy",
                title=titles.get(key, key),
                description=value,
                source_path="backend/src/app/api/routes/governance.py",
                source_endpoint="/v1/governance/policies",
                content_available=True,
                content_preview=_preview(value),
                related_data_products=[
                    "silver.service_level_commitments_geo_latest",
                    "gold.fact_supply_commitment_latest",
                ],
                related_entities=["etl_run"],
                evidence=[
                    f"governance.policies key={key}",
                    "GET /v1/governance/policies",
                ],
                status="available",
                limitations=["Static policy text; not environment-specific configuration."],
            )
        )
    return assets


def _lineage_graph_asset() -> KnowledgeAsset:
    catalog = get_catalog_tables_static()
    graph = build_graph(catalog, mode="latest")
    node_count = len(graph.get("nodes", []))
    edge_count = len(graph.get("edges", []))
    preview_source = json.dumps(
        {
            "node_count": node_count,
            "edge_count": edge_count,
            "sample_edge": graph["edges"][0] if graph.get("edges") else None,
        },
        ensure_ascii=False,
    )
    return KnowledgeAsset(
        asset_id="lineage_graph.transform_registry",
        asset_type="lineage_graph",
        title="Pipeline lineage graph (transform registry)",
        description="Table-level lineage graph built from TRANSFORM_REGISTRY; no inferred mesh edges.",
        source_path="backend/src/app/lineage/registry.py",
        source_endpoint="/v1/lineage/graph",
        content_available=True,
        content_preview=_preview(preview_source),
        related_data_products=_dataset_names() + ["source.myto_list"],
        related_entities=["pdf_document", "supply_commitment", "etl_run"],
        evidence=[
            "TRANSFORM_REGISTRY in lineage/registry.py",
            "build_graph in lineage/builder.py",
            "GET /v1/lineage/graph",
        ],
        status="available",
        limitations=[
            "Registry-based; no run-scoped transform_runs persistence.",
            "mode=run does not change edges without runtime logs.",
        ],
    )


def _catalog_metadata_asset() -> KnowledgeAsset:
    tables = get_catalog_tables_static()
    preview_source = json.dumps(tables[:2], ensure_ascii=False)
    return KnowledgeAsset(
        asset_id="catalog_metadata.static_tables",
        asset_type="catalog_metadata",
        title="Lineage catalog table metadata",
        description="Static catalog entries for lineage nodes and discovery filters.",
        source_path="backend/src/app/lineage/catalog_data.py",
        source_endpoint="/v1/catalog/tables",
        content_available=True,
        content_preview=_preview(preview_source),
        related_data_products=[t.get("name") or t.get("id", "") for t in tables if t.get("name") or t.get("id")],
        related_entities=["pdf_document", "supply_commitment", "etl_run"],
        evidence=[
            "get_catalog_tables_static in lineage/catalog_data.py",
            "GET /v1/catalog/tables",
        ],
        status="available",
        limitations=[
            "Static metadata; rowCount/lastUpdated enriched only when /v1/catalog/tables queries DB.",
            "This endpoint does not query DB for row counts.",
        ],
    )


def _file_asset(
    *,
    asset_id: str,
    asset_type: str,
    title: str,
    description: str,
    relative_path: str,
    source_endpoint: str | None,
    related_data_products: list[str],
    related_entities: list[str],
    evidence: list[str],
    limitations: list[str],
    status: str = "reference_only",
) -> KnowledgeAsset | None:
    available, content = _read_doc(relative_path)
    if not available:
        return None
    return KnowledgeAsset(
        asset_id=asset_id,
        asset_type=asset_type,
        title=title,
        description=description,
        source_path=relative_path,
        source_endpoint=source_endpoint,
        content_available=True,
        content_preview=_preview(content),
        related_data_products=related_data_products,
        related_entities=related_entities,
        evidence=evidence + [f"File exists: {relative_path}"],
        status=status,
        limitations=limitations,
    )


def _collect_doc_warnings(included_doc_paths: set[str]) -> list[str]:
    warnings: list[str] = []
    for rel in EXPECTED_DOC_PATHS:
        if rel not in included_doc_paths:
            warnings.append(f"Expected documentation not found or unreadable; asset omitted: {rel}")
    return warnings


def build_knowledge_assets() -> KnowledgeAssetsResponse:
    """Build knowledge asset registry. Pure read-only aggregation."""
    assets: list[KnowledgeAsset] = []

    assets.append(_column_dictionary_asset())
    assets.append(_dataset_catalog_asset())
    assets.extend(_dq_rule_assets())
    assets.extend(_governance_policy_assets())
    assets.append(_lineage_graph_asset())
    assets.append(_catalog_metadata_asset())

    file_specs: list[dict[str, Any]] = [
        {
            "asset_id": "readme.platform",
            "asset_type": "readme",
            "title": "GridSight platform README",
            "description": "Product overview, pipeline stages, and API index.",
            "relative_path": "README.md",
            "source_endpoint": None,
            "related_data_products": _dataset_names()[:5],
            "related_entities": ["etl_run", "pdf_document", "supply_commitment"],
            "evidence": ["README.md at repository root"],
            "limitations": ["Legacy MYTO Platform naming in document title."],
        },
        {
            "asset_id": "runbook.lineage_explorer",
            "asset_type": "runbook",
            "title": "Lineage Explorer runbook",
            "description": "How lineage is fed via transform registry and catalog.",
            "relative_path": "LINEAGE_README.md",
            "source_endpoint": "/v1/lineage/graph",
            "related_data_products": _dataset_names(),
            "related_entities": ["etl_run"],
            "evidence": ["LINEAGE_README.md"],
            "limitations": ["Documents transform_runs as not yet persisted."],
        },
        {
            "asset_id": "ambiguity_register.missing_ambiguous",
            "asset_type": "ambiguity_register",
            "title": "Missing and ambiguous items register",
            "description": "Explicit gaps and ambiguous areas; do not invent silently.",
            "relative_path": "MISSING_AMBIGUOUS.md",
            "source_endpoint": None,
            "related_data_products": ["silver.service_level_commitments_geo_latest"],
            "related_entities": ["location", "feeder"],
            "evidence": ["MISSING_AMBIGUOUS.md"],
            "limitations": ["Register only; does not resolve gaps."],
        },
        {
            "asset_id": "runbook.crawler_flow",
            "asset_type": "runbook",
            "title": "MYTO crawler flow and bottlenecks",
            "description": "Discover/download/extract stage behavior and operational notes.",
            "relative_path": "backend/docs/CRAWLER_FLOW_AND_BOTTLENECKS.md",
            "source_endpoint": None,
            "related_data_products": ["bronze.pdf_registry", "bronze.pdf_artifact", "bronze.pdf_table_raw"],
            "related_entities": ["pdf_document", "etl_run"],
            "evidence": ["backend/docs/CRAWLER_FLOW_AND_BOTTLENECKS.md"],
            "limitations": ["Operational doc; not executed by API."],
        },
        {
            "asset_id": "architecture_diagram.medallion",
            "asset_type": "architecture_diagram",
            "title": "Medallion architecture diagram (Mermaid)",
            "description": "Frontend Mermaid diagram definitions for pipeline and medallion layers.",
            "relative_path": "frontend/src/lib/diagrams.ts",
            "source_endpoint": None,
            "related_data_products": _dataset_names(),
            "related_entities": ["etl_run", "pdf_document", "supply_commitment"],
            "evidence": ["frontend/src/lib/diagrams.ts MEDALLION_DIAGRAM export"],
            "limitations": ["TypeScript source; rendered by frontend Architecture page only."],
        },
    ]

    included_doc_paths: set[str] = set()
    for spec in file_specs:
        asset = _file_asset(**spec)
        if asset:
            assets.append(asset)
            included_doc_paths.add(spec["relative_path"])

    return KnowledgeAssetsResponse(
        generated_at=datetime.now(timezone.utc).isoformat(),
        assets=assets,
        warnings=_collect_doc_warnings(included_doc_paths),
    )
