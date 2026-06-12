"""
GridSight Signal surface (v0.1).

Rule-based operational signals from existing metrics APIs and read-only DB queries.
No writes, ETL, AI, ML, or forecasting.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.schemas import get_snapshot_meta
from app.config import get_settings

SIGNALS_VERSION = "0.1"

ALLOWED_SIGNAL_TYPES = [
    "dq_score_signal",
    "geocode_coverage_signal",
    "extraction_coverage_signal",
    "pipeline_success_signal",
    "snapshot_freshness_signal",
    "pipeline_running_signal",
    "scheduler_status_signal",
]

FORBIDDEN_SIGNAL_TYPES = [
    "feeder_anomaly_signal",
    "disco_compliance_signal",
    "outage_signal",
    "transformer_risk_signal",
    "tariff_decision_signal",
]

VALID_SEVERITIES = {"low", "medium", "high", "critical"}
VALID_STATUSES = {"new", "acknowledged", "under_review", "dismissed", "archived"}


class GridSightSignal(BaseModel):
    signal_id: str
    signal_type: str
    signal_name: str
    description: str
    severity: str
    confidence: float = Field(ge=0.0, le=1.0)
    detected_at: str
    source_endpoint: str
    source_table: str | None = None
    related_entities: list[str] = Field(default_factory=list)
    related_data_products: list[str] = Field(default_factory=list)
    evidence: list[str] = Field(default_factory=list)
    status: str
    limitations: list[str] = Field(default_factory=list)
    metric_value: float | int | str | bool | None = None


class SignalsResponse(BaseModel):
    product_id: str = "gridsight"
    signals_version: str = SIGNALS_VERSION
    generated_at: str
    signals: list[GridSightSignal]
    evidence_sources: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


@dataclass
class SignalMetrics:
    dq_score: float | None = None
    dq_total_records: int = 0
    geocode_coverage_pct: float | None = None
    geocoded_count: int = 0
    geocode_cache_entries: int = 0
    extraction_coverage_pct: float | None = None
    pdfs_discovered: int = 0
    raw_tables_extracted: int = 0
    pipeline_success_rate: float | None = None
    pipeline_runs_sampled: int = 0
    snapshot_age_seconds: int | None = None
    snapshot_refreshed_at: str | None = None
    pipeline_running: bool = False
    running_run_id: str | None = None
    scheduler_enabled: bool = False
    scheduler_last_triggered: str | None = None
    scheduler_next_estimate: str | None = None
    db_health_ok: bool = True
    collection_errors: list[str] = field(default_factory=list)


def _signal_id(signal_type: str, stable_identifier: str = "latest") -> str:
    return f"gridsight:signal:{signal_type}:{stable_identifier}"


def _pct_severity(pct: float, *, higher_is_better: bool) -> str:
    """Map percentage metric to severity (higher_is_better=True for scores/coverage)."""
    if higher_is_better:
        if pct >= 95:
            return "low"
        if pct >= 80:
            return "medium"
        if pct >= 60:
            return "high"
        return "critical"
    if pct <= 5:
        return "low"
    if pct <= 20:
        return "medium"
    if pct <= 40:
        return "high"
    return "critical"


def _age_severity(age_seconds: int | None) -> str:
    if age_seconds is None:
        return "high"
    if age_seconds < 86400:
        return "low"
    if age_seconds < 259200:
        return "medium"
    if age_seconds < 604800:
        return "high"
    return "critical"


def _confidence(*, has_value: bool, sample_size: int = 0, min_sample: int = 1) -> float:
    if not has_value:
        return 0.0
    if sample_size >= min_sample:
        return 0.95
    if sample_size > 0:
        return 0.7
    return 0.85


async def collect_signal_metrics(db: AsyncSession) -> SignalMetrics:
    """Read-only aggregation mirroring existing /v1/dq, metadata, metrics, scheduler sources."""
    metrics = SignalMetrics()
    try:
        snapshot_run_id, refreshed_at = await get_snapshot_meta(db)
        metrics.snapshot_refreshed_at = refreshed_at

        r = await db.execute(
            text("""
                SELECT dq_status, count(*) FROM silver.service_level_commitments_dq
                WHERE run_id = (SELECT run_id FROM silver.service_level_commitments_geo_latest LIMIT 1)
                GROUP BY dq_status
            """)
        )
        rows = r.all()
        total = sum(x[1] for x in rows)
        pass_count = next((x[1] for x in rows if x[0] == "pass"), 0)
        if total > 0:
            metrics.dq_score = round(100 * pass_count / total, 1)
            metrics.dq_total_records = total

        r2 = await db.execute(text("SELECT count(*) FROM silver.service_level_commitments_geo_latest"))
        total_geo = r2.scalars().first() or 0
        r3 = await db.execute(
            text(
                "SELECT count(*) FROM silver.service_level_commitments_geo_latest "
                "WHERE lat IS NOT NULL AND lon IS NOT NULL"
            )
        )
        geo_count = r3.scalars().first() or 0
        if total_geo > 0:
            metrics.geocode_coverage_pct = round(100 * geo_count / total_geo, 1)
            metrics.geocoded_count = geo_count

        r4 = await db.execute(text("SELECT count(*) FROM bronze.pdf_table_raw"))
        raw_tables = r4.scalars().first() or 0
        r5 = await db.execute(text("SELECT count(*) FROM bronze.pdf_registry"))
        pdfs = r5.scalars().first() or 0
        metrics.raw_tables_extracted = raw_tables
        metrics.pdfs_discovered = pdfs
        if pdfs > 0:
            metrics.extraction_coverage_pct = round(100 * raw_tables / pdfs, 1)

        r6 = await db.execute(text("SELECT count(*) FROM silver.geocode_cache"))
        metrics.geocode_cache_entries = r6.scalars().first() or 0

        r7 = await db.execute(
            text("""
                SELECT count(*), count(*) FILTER (WHERE status = 'success') FROM bronze.etl_run
                WHERE run_id IN (SELECT run_id FROM bronze.etl_run ORDER BY started_at DESC LIMIT 10)
            """)
        )
        run_row = r7.first()
        if run_row and run_row[0]:
            metrics.pipeline_runs_sampled = run_row[0]
            metrics.pipeline_success_rate = round(100 * (run_row[1] or 0) / run_row[0], 0)

        if refreshed_at:
            try:
                dt = datetime.fromisoformat(refreshed_at.replace("Z", "+00:00"))
                metrics.snapshot_age_seconds = int((datetime.now(timezone.utc) - dt).total_seconds())
            except Exception:
                pass
        else:
            r8 = await db.execute(
                text(
                    "SELECT finished_at FROM bronze.etl_run "
                    "WHERE status = 'success' AND finished_at IS NOT NULL "
                    "ORDER BY finished_at DESC LIMIT 1"
                )
            )
            row8 = r8.first()
            if row8 and row8[0]:
                finished = row8[0]
                metrics.snapshot_refreshed_at = (
                    finished.isoformat() if hasattr(finished, "isoformat") else str(finished)
                )
                metrics.snapshot_age_seconds = int(
                    (datetime.now(timezone.utc) - finished).total_seconds()
                )

        r9 = await db.execute(
            text("SELECT run_id FROM bronze.etl_run WHERE status = 'running' LIMIT 1")
        )
        running = r9.first()
        if running:
            metrics.pipeline_running = True
            metrics.running_run_id = str(running[0])

        settings = get_settings()
        metrics.scheduler_enabled = bool(settings.cron_secret)
        r10 = await db.execute(
            text(
                "SELECT finished_at FROM bronze.etl_run "
                "WHERE status = 'success' ORDER BY finished_at DESC LIMIT 1"
            )
        )
        last = r10.first()
        if last and last[0]:
            metrics.scheduler_last_triggered = (
                last[0].isoformat() if hasattr(last[0], "isoformat") else str(last[0])
            )
            next_est = (last[0] + timedelta(days=1)).replace(hour=5, minute=0, second=0, microsecond=0)
            metrics.scheduler_next_estimate = next_est.isoformat()

    except Exception as exc:
        metrics.collection_errors.append(str(exc))

    return metrics


def build_signals_from_metrics(metrics: SignalMetrics, detected_at: str | None = None) -> SignalsResponse:
    """Pure rule-based signal evaluation from collected metrics."""
    ts = detected_at or datetime.now(timezone.utc).isoformat()
    signals: list[GridSightSignal] = []
    warnings: list[str] = list(metrics.collection_errors)

    if metrics.dq_score is not None and metrics.dq_total_records > 0:
        signals.append(
            GridSightSignal(
                signal_id=_signal_id("dq_score_signal"),
                signal_type="dq_score_signal",
                signal_name="Data quality score",
                description=(
                    f"Latest snapshot DQ pass rate is {metrics.dq_score}% "
                    f"across {metrics.dq_total_records} records."
                ),
                severity=_pct_severity(metrics.dq_score, higher_is_better=True),
                confidence=_confidence(has_value=True, sample_size=metrics.dq_total_records, min_sample=1),
                detected_at=ts,
                source_endpoint="/v1/dq/summary",
                source_table="silver.service_level_commitments_dq",
                related_entities=["supply_commitment"],
                related_data_products=["silver.service_level_commitments_dq"],
                evidence=[
                    "GET /v1/dq/summary dq_score",
                    "silver.service_level_commitments_dq aggregated by dq_status",
                    "services/validation.py dq_status_for_slc_row",
                ],
                status="new",
                limitations=["Scoped to latest snapshot run_id; no per-disco breakdown."],
                metric_value=metrics.dq_score,
            )
        )

    if metrics.geocode_coverage_pct is not None:
        signals.append(
            GridSightSignal(
                signal_id=_signal_id("geocode_coverage_signal"),
                signal_type="geocode_coverage_signal",
                signal_name="Geocode coverage",
                description=(
                    f"Geocode coverage is {metrics.geocode_coverage_pct}% "
                    f"({metrics.geocoded_count} geocoded rows in latest snapshot)."
                ),
                severity=_pct_severity(metrics.geocode_coverage_pct, higher_is_better=True),
                confidence=_confidence(
                    has_value=True,
                    sample_size=metrics.geocoded_count if metrics.geocoded_count else 1,
                ),
                detected_at=ts,
                source_endpoint="/v1/metadata/coverage",
                source_table="silver.service_level_commitments_geo_latest",
                related_entities=["location", "supply_commitment"],
                related_data_products=[
                    "silver.service_level_commitments_geo_latest",
                    "silver.geocode_cache",
                ],
                evidence=[
                    "GET /v1/metadata/coverage geocode_coverage_pct",
                    "GET /v1/metrics/geocode geocode_coverage_pct",
                    "silver.service_level_commitments_geo_latest lat/lon counts",
                    f"silver.geocode_cache entries={metrics.geocode_cache_entries}",
                ],
                status="new",
                limitations=["Coverage is latest snapshot only; cache_hit_rate not populated in metrics API."],
                metric_value=metrics.geocode_coverage_pct,
            )
        )

    if metrics.extraction_coverage_pct is not None:
        signals.append(
            GridSightSignal(
                signal_id=_signal_id("extraction_coverage_signal"),
                signal_type="extraction_coverage_signal",
                signal_name="PDF extraction coverage",
                description=(
                    f"Extraction coverage is {metrics.extraction_coverage_pct}% "
                    f"({metrics.raw_tables_extracted} tables from {metrics.pdfs_discovered} PDFs discovered)."
                ),
                severity=_pct_severity(metrics.extraction_coverage_pct, higher_is_better=True),
                confidence=_confidence(has_value=True, sample_size=metrics.pdfs_discovered, min_sample=1),
                detected_at=ts,
                source_endpoint="/v1/metadata/coverage",
                source_table="bronze.pdf_table_raw",
                related_entities=["pdf_document"],
                related_data_products=["bronze.pdf_registry", "bronze.pdf_table_raw"],
                evidence=[
                    "GET /v1/metadata/coverage extraction_coverage_pct",
                    "GET /v1/metrics/extraction/methods",
                    "bronze.pdf_registry vs bronze.pdf_table_raw counts",
                ],
                status="new",
                limitations=["Ratio uses discovered PDF count vs raw table rows; not per-PDF success rate."],
                metric_value=metrics.extraction_coverage_pct,
            )
        )

    if metrics.pipeline_success_rate is not None and metrics.pipeline_runs_sampled > 0:
        signals.append(
            GridSightSignal(
                signal_id=_signal_id("pipeline_success_signal"),
                signal_type="pipeline_success_signal",
                signal_name="Pipeline success rate",
                description=(
                    f"Pipeline success rate is {metrics.pipeline_success_rate}% "
                    f"over last {metrics.pipeline_runs_sampled} runs."
                ),
                severity=_pct_severity(metrics.pipeline_success_rate, higher_is_better=True),
                confidence=_confidence(
                    has_value=True,
                    sample_size=metrics.pipeline_runs_sampled,
                    min_sample=3,
                ),
                detected_at=ts,
                source_endpoint="/v1/metrics/pipeline/performance",
                source_table="bronze.etl_run",
                related_entities=["etl_run"],
                related_data_products=["bronze.etl_run", "bronze.etl_stage"],
                evidence=[
                    "GET /v1/metrics/pipeline/performance success_rate",
                    "GET /v1/metrics/pipeline/timeseries",
                    "bronze.etl_run status counts",
                    "bronze.etl_stage per-stage status",
                ],
                status="new",
                limitations=["Sample window is last 10 runs; timeseries not merged into severity."],
                metric_value=metrics.pipeline_success_rate,
            )
        )

    if metrics.snapshot_age_seconds is not None or metrics.snapshot_refreshed_at:
        age = metrics.snapshot_age_seconds
        signals.append(
            GridSightSignal(
                signal_id=_signal_id("snapshot_freshness_signal"),
                signal_type="snapshot_freshness_signal",
                signal_name="Snapshot freshness",
                description=(
                    f"Latest snapshot age is {age if age is not None else 'unknown'} seconds "
                    f"(refreshed_at={metrics.snapshot_refreshed_at or 'unknown'})."
                ),
                severity=_age_severity(age),
                confidence=_confidence(has_value=age is not None or bool(metrics.snapshot_refreshed_at)),
                detected_at=ts,
                source_endpoint="/v1/metadata/freshness",
                source_table="silver.service_level_commitments_geo_latest",
                related_entities=["supply_commitment", "etl_run"],
                related_data_products=[
                    "silver.service_level_commitments_geo_latest",
                    "gold.fact_supply_commitment_latest",
                ],
                evidence=[
                    "GET /v1/metadata/freshness age_seconds",
                    "silver.service_level_commitments_geo_latest refreshed_at",
                ],
                status="new",
                limitations=["Falls back to last successful run when latest snapshot empty."],
                metric_value=age,
            )
        )

    signals.append(
        GridSightSignal(
            signal_id=_signal_id("pipeline_running_signal"),
            signal_type="pipeline_running_signal",
            signal_name="Pipeline running state",
            description=(
                "A pipeline run is currently in progress."
                if metrics.pipeline_running
                else "No pipeline run is currently in progress."
            ),
            severity="medium" if metrics.pipeline_running else "low",
            confidence=0.95,
            detected_at=ts,
            source_endpoint="/v1/scheduler/status",
            source_table="bronze.etl_run",
            related_entities=["etl_run"],
            related_data_products=["bronze.etl_run", "bronze.etl_stage"],
            evidence=[
                "GET /v1/scheduler/status currently_running",
                "bronze.etl_run status='running'",
                f"running_run_id={metrics.running_run_id or 'none'}",
            ],
            status="new",
            limitations=["Does not detect stuck runs beyond heartbeat_at (see runs API)."],
            metric_value=metrics.pipeline_running,
        )
    )

    sched_severity = "low"
    if not metrics.scheduler_enabled:
        sched_severity = "medium"
    elif metrics.pipeline_running:
        sched_severity = "low"
    signals.append(
        GridSightSignal(
            signal_id=_signal_id("scheduler_status_signal"),
            signal_type="scheduler_status_signal",
            signal_name="Scheduler status",
            description=(
                f"Scheduler enabled={metrics.scheduler_enabled}; "
                f"last_triggered={metrics.scheduler_last_triggered or 'never'}; "
                f"next_estimate={metrics.scheduler_next_estimate or 'unknown'}."
            ),
            severity=sched_severity,
            confidence=0.9 if metrics.scheduler_enabled else 0.75,
            detected_at=ts,
            source_endpoint="/v1/scheduler/status",
            source_table="bronze.etl_run",
            related_entities=["etl_run"],
            related_data_products=["bronze.etl_run"],
            evidence=[
                "GET /v1/scheduler/status enabled/last_triggered/next_run_estimate",
                "config cron_secret presence",
                "bronze.etl_run last successful finished_at",
            ],
            status="new",
            limitations=["enabled reflects CRON_SECRET config, not external cron reachability."],
            metric_value=metrics.scheduler_enabled,
        )
    )

    return SignalsResponse(
        generated_at=ts,
        signals=signals,
        evidence_sources=[
            "GET /v1/dq/summary",
            "GET /v1/metadata/coverage",
            "GET /v1/metadata/freshness",
            "GET /v1/metrics/pipeline/performance",
            "GET /v1/metrics/pipeline/timeseries",
            "GET /v1/metrics/extraction/methods",
            "GET /v1/metrics/geocode",
            "GET /v1/scheduler/status",
            "GET /v1/health",
        ],
        warnings=warnings,
    )


async def build_signals(db: AsyncSession) -> SignalsResponse:
    """Collect metrics read-only and evaluate rule-based signals."""
    metrics = await collect_signal_metrics(db)
    return build_signals_from_metrics(metrics)
