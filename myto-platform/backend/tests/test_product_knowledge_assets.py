"""Tests for GridSight knowledge assets endpoint."""
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.product_knowledge_assets import (
    EXPECTED_DOC_PATHS,
    PREVIEW_MAX_LEN,
    build_knowledge_assets,
)

client = TestClient(app)

EVIDENCE_SOURCE_PATHS = {
    "backend/src/app/api/routes/metadata.py",
    "backend/src/app/api/routes/dq.py",
    "backend/src/app/api/routes/governance.py",
    "backend/src/app/lineage/registry.py",
    "backend/src/app/lineage/catalog_data.py",
    "README.md",
    "LINEAGE_README.md",
    "MISSING_AMBIGUOUS.md",
    "backend/docs/CRAWLER_FLOW_AND_BOTTLENECKS.md",
    "frontend/src/lib/diagrams.ts",
}


def test_build_knowledge_assets_is_pure():
    a = build_knowledge_assets()
    b = build_knowledge_assets()
    assert a.product_id == b.product_id
    assert len(a.assets) == len(b.assets)


def test_get_knowledge_assets_returns_200():
    response = client.get("/v1/product/knowledge-assets")
    assert response.status_code == 200


def test_get_knowledge_assets_product_identity():
    data = client.get("/v1/product/knowledge-assets").json()["data"]
    assert data["product_id"] == "gridsight"
    assert data["knowledge_assets_version"] == "0.1"
    assert "generated_at" in data
    assert isinstance(data["assets"], list)
    assert len(data["assets"]) > 0


def test_knowledge_assets_are_evidence_backed():
    data = client.get("/v1/product/knowledge-assets").json()["data"]
    for asset in data["assets"]:
        assert asset["asset_id"]
        assert asset["asset_type"]
        assert asset["title"]
        assert asset["description"]
        assert asset["source_path"]
        assert asset["content_available"] is True
        assert asset["evidence"]
        assert asset["status"]
        assert asset["source_path"] in EVIDENCE_SOURCE_PATHS or asset["source_path"].startswith(
            ("backend/", "frontend/", "README")
        )
        for path in (asset["source_path"],):
            if path.endswith(".py"):
                assert Path(__file__).resolve().parents[1] / "src" / "app" / path.split("backend/src/app/", 1)[-1]
            elif path == "README.md":
                assert (Path(__file__).resolve().parents[2] / path).is_file()


def test_knowledge_assets_include_core_types():
    data = client.get("/v1/product/knowledge-assets").json()["data"]
    types = {a["asset_type"] for a in data["assets"]}
    assert "column_dictionary" in types
    assert "dataset_catalog" in types
    assert "dq_rule" in types
    assert "governance_policy" in types
    assert "lineage_graph" in types
    assert "catalog_metadata" in types


def test_knowledge_assets_content_previews_are_short():
    data = client.get("/v1/product/knowledge-assets").json()["data"]
    for asset in data["assets"]:
        preview = asset.get("content_preview")
        if preview:
            assert len(preview) <= PREVIEW_MAX_LEN


def test_knowledge_assets_missing_docs_not_claimed():
    root = Path(__file__).resolve().parents[2]
    data = client.get("/v1/product/knowledge-assets").json()["data"]
    asset_paths = {a["source_path"] for a in data["assets"]}
    for rel in EXPECTED_DOC_PATHS:
        exists = (root / rel).is_file()
        if not exists:
            assert rel not in asset_paths
            assert any(rel in w for w in data.get("warnings", []))


def test_knowledge_assets_no_fabricated_doc_assets(monkeypatch):
    root = Path(__file__).resolve().parents[2]

    def fake_read(rel: str):
        return False, None

    with patch("app.services.product_knowledge_assets._read_doc", side_effect=fake_read):
        payload = build_knowledge_assets()
    doc_assets = [a for a in payload.assets if a.source_path.endswith(".md") or a.source_path.endswith(".ts")]
    assert doc_assets == []
    assert len(payload.warnings) == len(EXPECTED_DOC_PATHS)


@patch("app.etl.orchestrator.run_pipeline")
@patch("app.etl.stages.discover.discover_myto_pdfs")
def test_knowledge_assets_does_not_invoke_etl(mock_discover, mock_run_pipeline):
    response = client.get("/v1/product/knowledge-assets")
    assert response.status_code == 200
    mock_run_pipeline.assert_not_called()
    mock_discover.assert_not_called()


@patch("app.db.get_db")
def test_knowledge_assets_does_not_use_db(mock_get_db):
    response = client.get("/v1/product/knowledge-assets")
    assert response.status_code == 200
    mock_get_db.assert_not_called()


def test_knowledge_assets_does_not_modify_files(tmp_path):
    root = Path(__file__).resolve().parents[2]
    readme = root / "README.md"
    assert readme.is_file()
    mtime_before = readme.stat().st_mtime
    response = client.get("/v1/product/knowledge-assets")
    assert response.status_code == 200
    mtime_after = readme.stat().st_mtime
    assert mtime_before == mtime_after


def test_existing_apis_still_work():
    health = client.get("/v1/healthz")
    assert health.status_code == 200
    datasets = client.get("/v1/metadata/datasets")
    assert datasets.status_code == 200
    manifest = client.get("/v1/product/manifest")
    assert manifest.status_code == 200
    assert "knowledge_assets" in manifest.json()["data"]["supported_capabilities"]
