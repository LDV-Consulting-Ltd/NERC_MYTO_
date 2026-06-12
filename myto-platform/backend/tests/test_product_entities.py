"""Tests for GridSight entity surface endpoint."""
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.product_entities import (
    ALLOWED_ENTITY_TYPES,
    FORBIDDEN_ENTITY_TYPES,
    build_entities,
)

client = TestClient(app)


def test_build_entities_is_pure():
    a = build_entities()
    b = build_entities()
    assert a.product_id == b.product_id
    assert len(a.entities) == len(b.entities)


def test_get_entities_returns_200():
    response = client.get("/v1/product/entities")
    assert response.status_code == 200


def test_get_entities_product_identity():
    data = client.get("/v1/product/entities").json()["data"]
    assert data["product_id"] == "gridsight"
    assert data["entities_version"] == "0.1"
    assert "generated_at" in data
    assert len(data["entities"]) == len(ALLOWED_ENTITY_TYPES)


def test_entities_only_allowed_types():
    data = client.get("/v1/product/entities").json()["data"]
    emitted_types = {e["entity_type"] for e in data["entities"]}
    assert emitted_types == set(ALLOWED_ENTITY_TYPES)


def test_entities_include_evidence():
    data = client.get("/v1/product/entities").json()["data"]
    for entity in data["entities"]:
        assert entity["entity_id"].startswith("gridsight:entity:")
        assert entity["evidence"]
        assert len(entity["evidence"]) >= 1
        assert entity["backing_table"]
        assert entity["attributes"]
        assert entity["confidence"]
        assert entity["status"] == "type_summary"


def test_entities_stable_id_patterns():
    data = client.get("/v1/product/entities").json()["data"]
    for entity in data["entities"]:
        assert entity["entity_id"].startswith("gridsight:entity:type:")
        pattern = entity["attributes"].get("stable_instance_id_pattern")
        assert pattern
        assert pattern.startswith("gridsight:entity:")


def test_no_invented_entity_types():
    data = client.get("/v1/product/entities").json()["data"]
    emitted = " ".join(
        e["entity_type"].lower() + " " + e["entity_name"].lower() + " " + e["description"].lower()
        for e in data["entities"]
    )
    for forbidden in FORBIDDEN_ENTITY_TYPES:
        assert forbidden not in emitted


def test_entities_required_fields():
    data = client.get("/v1/product/entities").json()["data"]
    required = {
        "entity_id",
        "entity_type",
        "entity_name",
        "description",
        "source_layer",
        "backing_table",
        "backing_api",
        "attributes",
        "evidence",
        "confidence",
        "status",
        "limitations",
    }
    for entity in data["entities"]:
        assert required.issubset(entity.keys())


@patch("app.etl.orchestrator.run_pipeline")
@patch("app.etl.stages.discover.discover_myto_pdfs")
def test_entities_does_not_invoke_etl(mock_discover, mock_run_pipeline):
    response = client.get("/v1/product/entities")
    assert response.status_code == 200
    mock_run_pipeline.assert_not_called()
    mock_discover.assert_not_called()


@patch("app.db.get_db")
def test_entities_does_not_use_db(mock_get_db):
    response = client.get("/v1/product/entities")
    assert response.status_code == 200
    mock_get_db.assert_not_called()


def test_existing_apis_still_work():
    health = client.get("/v1/healthz")
    assert health.status_code == 200
    manifest = client.get("/v1/product/manifest")
    assert manifest.status_code == 200
    assert "entity_surface" in manifest.json()["data"]["supported_capabilities"]
    knowledge = client.get("/v1/product/knowledge-assets")
    assert knowledge.status_code == 200
    datasets = client.get("/v1/metadata/datasets")
    assert datasets.status_code == 200
