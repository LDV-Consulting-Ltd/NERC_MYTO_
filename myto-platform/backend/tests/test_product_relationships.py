"""Tests for GridSight relationship surface endpoint."""
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.lineage.registry import TRANSFORM_REGISTRY
from app.services.product_relationships import (
    ALLOWED_RELATIONSHIP_TYPES,
    FORBIDDEN_RELATIONSHIP_PATTERNS,
    build_relationships,
)

client = TestClient(app)

REQUIRED_USER_EXAMPLES = [
    ("source.myto_list", "produces", "bronze.pdf_registry"),
    ("bronze.pdf_registry", "produces", "bronze.pdf_artifact"),
    ("bronze.pdf_artifact", "produces", "bronze.pdf_table_raw"),
    ("bronze.pdf_table_raw", "produces", "silver.service_level_commitments"),
    ("silver.service_level_commitments", "produces", "silver.service_level_commitments_geo"),
    ("silver.service_level_commitments_geo", "produces", "gold.fact_supply_commitment"),
    ("gold.fact_supply_commitment", "references", "gold.dim_disco"),
    ("gold.fact_supply_commitment", "references", "gold.dim_feeder"),
    ("gold.fact_supply_commitment", "references", "gold.dim_location"),
    ("gold.fact_supply_commitment", "references", "gold.dim_date"),
    ("gold.dim_feeder", "belongs_to", "gold.dim_disco"),
    (
        "silver.service_level_commitments_geo",
        "latest_snapshot_of",
        "silver.service_level_commitments_geo_latest",
    ),
    (
        "gold.fact_supply_commitment",
        "latest_snapshot_of",
        "gold.fact_supply_commitment_latest",
    ),
]


def _rel_key(source: str, rel_type: str, target: str) -> str:
    return f"gridsight:relationship:{source}:{rel_type}:{target}"


def test_build_relationships_is_pure():
    a = build_relationships()
    b = build_relationships()
    assert len(a.relationships) == len(b.relationships)


def test_get_relationships_returns_200():
    response = client.get("/v1/product/relationships")
    assert response.status_code == 200


def test_get_relationships_product_identity():
    data = client.get("/v1/product/relationships").json()["data"]
    assert data["product_id"] == "gridsight"
    assert data["relationships_version"] == "0.1"
    assert len(data["relationships"]) > 0


def test_relationships_include_evidence():
    data = client.get("/v1/product/relationships").json()["data"]
    for rel in data["relationships"]:
        assert rel["relationship_id"].startswith("gridsight:relationship:")
        assert rel["relationship_type"] in ALLOWED_RELATIONSHIP_TYPES
        assert rel["evidence"]
        assert len(rel["evidence"]) >= 1
        assert rel["source_object_id"]
        assert rel["target_object_id"]


def test_required_examples_present():
    data = client.get("/v1/product/relationships").json()["data"]
    ids = {r["relationship_id"] for r in data["relationships"]}
    for source, rel_type, target in REQUIRED_USER_EXAMPLES:
        assert _rel_key(source, rel_type, target) in ids


def test_gold_fk_relationships_represented():
    data = client.get("/v1/product/relationships").json()["data"]
    fk_refs = [
        r
        for r in data["relationships"]
        if r["source_object_id"] == "gold.fact_supply_commitment"
        and r["relationship_type"] == "references"
    ]
    targets = {r["target_object_id"] for r in fk_refs}
    assert "gold.dim_disco" in targets
    assert "gold.dim_feeder" in targets
    assert "gold.dim_location" in targets
    assert "gold.dim_date" in targets


def test_lineage_registry_produces_edges_represented():
    data = client.get("/v1/product/relationships").json()["data"]
    produce_ids = {
        r["relationship_id"]
        for r in data["relationships"]
        if r["relationship_type"] == "produces"
    }
    for transform in TRANSFORM_REGISTRY:
        if transform["transform_name"] == "promote_latest":
            continue
        for src in transform["inputs"]:
            for tgt in transform["outputs"]:
                assert _rel_key(src, "produces", tgt) in produce_ids


def test_no_invented_forbidden_relationships():
    data = client.get("/v1/product/relationships").json()["data"]
    for rel in data["relationships"]:
        src = rel["source_object_id"].lower()
        tgt = rel["target_object_id"].lower()
        for left, right in FORBIDDEN_RELATIONSHIP_PATTERNS:
            assert not (left in src and right in tgt)
            assert not (right in src and left in tgt)


def test_no_invented_entity_tables():
    data = client.get("/v1/product/relationships").json()["data"]
    all_ids = {
        r["source_object_id"] + r["target_object_id"] for r in data["relationships"]
    }
    joined = " ".join(all_ids).lower()
    for forbidden in ("transformer", "substation", "customer", "meter", "outage"):
        assert forbidden not in joined


@patch("app.etl.orchestrator.run_pipeline")
@patch("app.etl.stages.discover.discover_myto_pdfs")
def test_relationships_does_not_invoke_etl(mock_discover, mock_run_pipeline):
    response = client.get("/v1/product/relationships")
    assert response.status_code == 200
    mock_run_pipeline.assert_not_called()
    mock_discover.assert_not_called()


@patch("app.db.get_db")
def test_relationships_does_not_use_db(mock_get_db):
    response = client.get("/v1/product/relationships")
    assert response.status_code == 200
    mock_get_db.assert_not_called()


def test_existing_apis_still_work():
    health = client.get("/v1/healthz")
    assert health.status_code == 200
    manifest = client.get("/v1/product/manifest")
    assert manifest.status_code == 200
    assert "relationship_surface" in manifest.json()["data"]["supported_capabilities"]
    entities = client.get("/v1/product/entities")
    assert entities.status_code == 200
    lineage = client.get("/v1/lineage/graph")
    assert lineage.status_code == 200
