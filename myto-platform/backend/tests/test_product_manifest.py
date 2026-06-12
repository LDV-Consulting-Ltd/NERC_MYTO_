"""Tests for GridSight product manifest endpoint."""
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.product_manifest import (
    LEGACY_ALIASES,
    UNSUPPORTED_CAPABILITIES,
    build_product_manifest,
)


client = TestClient(app)


def test_build_product_manifest_is_pure():
    m1 = build_product_manifest()
    m2 = build_product_manifest()
    assert m1.product_id == m2.product_id
    assert m1.product_name == m2.product_name
    assert m1.generated_at  # set per call


def test_get_product_manifest_returns_200():
    response = client.get("/v1/product/manifest")
    assert response.status_code == 200


def test_get_product_manifest_product_identity():
    response = client.get("/v1/product/manifest")
    body = response.json()
    data = body["data"]
    assert data["product_id"] == "gridsight"
    assert data["product_name"] == "GridSight"
    assert data["product_category"] == "Electricity & Utility Intelligence"
    assert data["owner"] == "LDV"


def test_get_product_manifest_legacy_aliases():
    response = client.get("/v1/product/manifest")
    data = response.json()["data"]
    for alias in LEGACY_ALIASES:
        assert alias in data["legacy_aliases"]
    assert "MYTO Platform" in data["legacy_aliases"]
    assert "URIP" in data["legacy_aliases"]


def test_get_product_manifest_openapi_url():
    response = client.get("/v1/product/manifest")
    data = response.json()["data"]
    assert data["openapi_url"] == "/openapi.json"
    assert data["api_title"] == "MYTO Platform API"
    assert data["api_version"] == "1.0.0"


def test_get_product_manifest_supported_capabilities():
    response = client.get("/v1/product/manifest")
    supported = response.json()["data"]["supported_capabilities"]
    assert "health" in supported
    assert "pipeline runs" in supported
    assert "lineage graph" in supported
    assert "rule-based agent query" in supported
    assert "knowledge_assets" in supported
    assert "entity_surface" in supported
    assert "relationship_surface" in supported
    assert "rule_based_signals" in supported


def test_get_product_manifest_unsupported_capabilities_honest():
    response = client.get("/v1/product/manifest")
    unsupported = response.json()["data"]["unsupported_capabilities"]
    for cap in UNSUPPORTED_CAPABILITIES:
        assert cap in unsupported
    assert "Tanna connector" in unsupported
    assert "parquet export" in unsupported
    assert "LLM-powered agent" in unsupported
    # Supported capabilities must not appear in unsupported list
    supported = response.json()["data"]["supported_capabilities"]
    overlap = set(supported) & set(unsupported)
    assert overlap == set()


def test_get_product_manifest_documentation_references():
    response = client.get("/v1/product/manifest")
    docs = response.json()["data"]["documentation_references"]
    assert "README.md" in docs
    assert "LINEAGE_README.md" in docs
    assert "MISSING_AMBIGUOUS.md" in docs
    assert "backend/docs/CRAWLER_FLOW_AND_BOTTLENECKS.md" in docs


@patch("app.etl.orchestrator.run_pipeline")
@patch("app.etl.stages.discover.discover_myto_pdfs")
def test_get_product_manifest_does_not_invoke_etl(mock_discover, mock_run_pipeline):
    response = client.get("/v1/product/manifest")
    assert response.status_code == 200
    mock_run_pipeline.assert_not_called()
    mock_discover.assert_not_called()


@patch("app.db.get_db")
def test_get_product_manifest_does_not_use_db(mock_get_db):
    response = client.get("/v1/product/manifest")
    assert response.status_code == 200
    mock_get_db.assert_not_called()
