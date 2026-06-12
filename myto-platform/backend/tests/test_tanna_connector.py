"""Tests for GridSight Tanna connector mounting and auth."""
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app

TEST_TOKEN = "test-tanna-token-for-pytest"


@pytest.fixture(autouse=True)
def tanna_token_env(monkeypatch):
    monkeypatch.setenv("TANNA_CONNECTOR_TOKEN", TEST_TOKEN)
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


client = TestClient(app)

TANNA_ROUTES = [
    "/api/v1/tanna/manifest",
    "/api/v1/tanna/health",
    "/api/v1/tanna/status",
    "/api/v1/tanna/data-products",
    "/api/v1/tanna/entities",
    "/api/v1/tanna/relationships",
    "/api/v1/tanna/signals",
    "/api/v1/tanna/patterns",
    "/api/v1/tanna/illuminations",
    "/api/v1/tanna/decision-products",
    "/api/v1/tanna/knowledge-assets",
]

TANNA_ROUTES_NO_DB = [p for p in TANNA_ROUTES if p not in ("/api/v1/tanna/status", "/api/v1/tanna/signals")]


def test_tanna_manifest_unauthorized_without_header():
    response = client.get("/api/v1/tanna/manifest")
    assert response.status_code == 401


@pytest.mark.parametrize("path", TANNA_ROUTES)
def test_tanna_routes_unauthorized_without_header(path):
    response = client.get(path)
    assert response.status_code == 401


def test_tanna_manifest_with_token():
    response = client.get(
        "/api/v1/tanna/manifest",
        headers={"Authorization": f"Bearer {TEST_TOKEN}"},
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["module_id"] == "gridsight"
    assert data["module_name"] == "GridSight"


def test_tanna_manifest_invalid_token():
    response = client.get(
        "/api/v1/tanna/manifest",
        headers={"Authorization": "Bearer wrong-token"},
    )
    assert response.status_code == 401


@pytest.mark.parametrize("path", TANNA_ROUTES_NO_DB)
def test_tanna_routes_authorized(path):
    response = client.get(path, headers={"Authorization": f"Bearer {TEST_TOKEN}"})
    assert response.status_code == 200, f"{path} returned {response.status_code}"


@patch("app.tanna_connector.router.build_tanna_status", new_callable=__import__("unittest.mock").mock.AsyncMock)
def test_tanna_status_authorized(mock_status):
    mock_status.return_value = {"module_id": "gridsight", "pipeline_running": False}
    response = client.get(
        "/api/v1/tanna/status",
        headers={"Authorization": f"Bearer {TEST_TOKEN}"},
    )
    assert response.status_code == 200


@patch("app.tanna_connector.router.build_signals", new_callable=__import__("unittest.mock").mock.AsyncMock)
def test_tanna_signals_authorized(mock_signals):
    from app.services.product_signals import SignalsResponse

    mock_signals.return_value = SignalsResponse(
        generated_at="2025-06-11T12:00:00+00:00",
        signals=[],
    )
    response = client.get(
        "/api/v1/tanna/signals",
        headers={"Authorization": f"Bearer {TEST_TOKEN}"},
    )
    assert response.status_code == 200


@patch("app.services.product_signals.collect_signal_metrics", new_callable=__import__("unittest.mock").mock.AsyncMock)
def test_tanna_signals_does_not_invoke_etl(mock_collect):
    from app.services.product_signals import SignalMetrics

    mock_collect.return_value = SignalMetrics(pipeline_running=False, scheduler_enabled=True)
    response = client.get(
        "/api/v1/tanna/signals",
        headers={"Authorization": f"Bearer {TEST_TOKEN}"},
    )
    assert response.status_code == 200


def test_existing_v1_product_manifest_unchanged():
    response = client.get("/v1/product/manifest")
    assert response.status_code == 200
    assert response.json()["data"]["product_id"] == "gridsight"


def test_tanna_not_implemented_objects():
    for path in (
        "/api/v1/tanna/patterns",
        "/api/v1/tanna/illuminations",
        "/api/v1/tanna/decision-products",
    ):
        response = client.get(path, headers={"Authorization": f"Bearer {TEST_TOKEN}"})
        assert response.status_code == 200
        assert response.json()["data"]["implementation_status"] == "not_implemented"
