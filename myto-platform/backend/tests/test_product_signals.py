"""Tests for GridSight rule-based signals endpoint."""
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.product_signals import (
    ALLOWED_SIGNAL_TYPES,
    FORBIDDEN_SIGNAL_TYPES,
    VALID_SEVERITIES,
    VALID_STATUSES,
    SignalMetrics,
    build_signals_from_metrics,
)

client = TestClient(app)


def _sample_metrics() -> SignalMetrics:
    return SignalMetrics(
        dq_score=88.5,
        dq_total_records=100,
        geocode_coverage_pct=72.0,
        geocoded_count=72,
        geocode_cache_entries=50,
        extraction_coverage_pct=65.0,
        pdfs_discovered=40,
        raw_tables_extracted=26,
        pipeline_success_rate=90.0,
        pipeline_runs_sampled=10,
        snapshot_age_seconds=3600,
        snapshot_refreshed_at="2025-06-11T12:00:00+00:00",
        pipeline_running=False,
        scheduler_enabled=True,
        scheduler_last_triggered="2025-06-11T05:00:00+00:00",
        scheduler_next_estimate="2025-06-12T05:00:00+00:00",
    )


def test_build_signals_from_metrics_pure():
    payload = build_signals_from_metrics(_sample_metrics(), detected_at="2025-06-11T12:00:00+00:00")
    assert payload.product_id == "gridsight"
    assert len(payload.signals) >= 6


def test_signals_only_allowed_types():
    payload = build_signals_from_metrics(_sample_metrics(), detected_at="2025-06-11T12:00:00+00:00")
    emitted = {s.signal_type for s in payload.signals}
    assert emitted.issubset(set(ALLOWED_SIGNAL_TYPES))
    for required in ALLOWED_SIGNAL_TYPES:
        assert required in emitted


def test_signals_include_evidence():
    payload = build_signals_from_metrics(_sample_metrics(), detected_at="2025-06-11T12:00:00+00:00")
    for signal in payload.signals:
        assert signal.signal_id.startswith("gridsight:signal:")
        assert signal.evidence
        assert len(signal.evidence) >= 1
        assert signal.source_endpoint.startswith("/v1/")


def test_signals_confidence_between_zero_and_one():
    payload = build_signals_from_metrics(_sample_metrics(), detected_at="2025-06-11T12:00:00+00:00")
    for signal in payload.signals:
        assert 0.0 <= signal.confidence <= 1.0


def test_signals_valid_severity_and_status():
    payload = build_signals_from_metrics(_sample_metrics(), detected_at="2025-06-11T12:00:00+00:00")
    for signal in payload.signals:
        assert signal.severity in VALID_SEVERITIES
        assert signal.status in VALID_STATUSES


def test_no_invented_signal_types():
    payload = build_signals_from_metrics(_sample_metrics(), detected_at="2025-06-11T12:00:00+00:00")
    emitted_types = {s.signal_type for s in payload.signals}
    for forbidden in FORBIDDEN_SIGNAL_TYPES:
        assert forbidden not in emitted_types
    forbidden_terms = ("anomaly", "compliance", "outage", "transformer", "tariff decision")
    for signal in payload.signals:
        text = f"{signal.signal_name} {signal.description}".lower()
        for term in forbidden_terms:
            assert term not in text


def test_dq_signal_omitted_without_evidence():
    metrics = _sample_metrics()
    metrics.dq_score = None
    metrics.dq_total_records = 0
    payload = build_signals_from_metrics(metrics, detected_at="2025-06-11T12:00:00+00:00")
    types = {s.signal_type for s in payload.signals}
    assert "dq_score_signal" not in types


@patch("app.services.product_signals.collect_signal_metrics", new_callable=AsyncMock)
def test_get_signals_returns_200(mock_collect):
    mock_collect.return_value = _sample_metrics()
    response = client.get("/v1/product/signals")
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["product_id"] == "gridsight"
    assert data["signals_version"] == "0.1"


@patch("app.etl.orchestrator.run_pipeline")
@patch("app.etl.stages.discover.discover_myto_pdfs")
@patch("app.services.product_signals.collect_signal_metrics", new_callable=AsyncMock)
def test_signals_does_not_invoke_etl(mock_collect, mock_discover, mock_run_pipeline):
    mock_collect.return_value = _sample_metrics()
    response = client.get("/v1/product/signals")
    assert response.status_code == 200
    mock_run_pipeline.assert_not_called()
    mock_discover.assert_not_called()


@patch("app.services.product_signals.collect_signal_metrics", new_callable=AsyncMock)
def test_signals_read_only_no_writes(mock_collect):
    mock_collect.return_value = _sample_metrics()
    response = client.get("/v1/product/signals")
    assert response.status_code == 200
    mock_collect.assert_called_once()


@patch("app.services.product_signals.collect_signal_metrics", new_callable=AsyncMock)
def test_existing_apis_still_work(mock_collect):
    mock_collect.return_value = _sample_metrics()
    health = client.get("/v1/healthz")
    assert health.status_code == 200
    manifest = client.get("/v1/product/manifest")
    assert manifest.status_code == 200
    assert "rule_based_signals" in manifest.json()["data"]["supported_capabilities"]
    assert "pattern detection" in manifest.json()["data"]["unsupported_capabilities"]
    relationships = client.get("/v1/product/relationships")
    assert relationships.status_code == 200
