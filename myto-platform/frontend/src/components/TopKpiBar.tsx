'use client';

import { useEffect, useState } from 'react';
import {
  getRuns,
  getGovernanceAudit,
  getDqSummary,
  getMetricsGeocode,
  getLatestMonths,
  getLatestDiscos,
} from '@/lib/api';
import type { RunSummary, DqSummary, GeocodeMetrics } from '@/lib/types';

export default function TopKpiBar() {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [audit, setAudit] = useState<{ audit: { run_id: string; refreshed_at: string | null }[] } | null>(null);
  const [dq, setDq] = useState<DqSummary | null>(null);
  const [geo, setGeo] = useState<GeocodeMetrics | null>(null);
  const [months, setMonths] = useState<{ year: number; month_name: string }[]>([]);
  const [discos, setDiscos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getRuns(20),
      getGovernanceAudit().catch(() => ({ audit: [] })),
      getDqSummary().catch(() => null),
      getMetricsGeocode().catch(() => null),
      getLatestMonths().catch(() => ({ months: [] })),
      getLatestDiscos().catch(() => ({ discos: [] })),
    ])
      .then(([r, a, d, g, m, dc]) => {
        setRuns(r);
        setAudit(a as { audit: { run_id: string; refreshed_at: string | null }[] });
        setDq(d);
        setGeo(g);
        setMonths((m as { months: { year: number; month_name: string }[] }).months || []);
        setDiscos((dc as { discos: string[] }).discos || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const lastSeven = runs.slice(0, 7);
  const successCount = lastSeven.filter((r) => r.status === 'success').length;
  const pipelineHealthPct = lastSeven.length ? Math.round((successCount / lastSeven.length) * 100) : null;
  const lastRefresh = audit?.audit?.[0]?.refreshed_at ?? null;
  const snapshotRunId = audit?.audit?.[0]?.run_id ?? null;
  const monthRange = months.length
    ? `${months[0]?.year}-${String(months[0]?.month_name || '').slice(0, 3)} → ${months[months.length - 1]?.year}-${String(months[months.length - 1]?.month_name || '').slice(0, 3)}`
    : '—';
  return (
    <div className="top-kpi-bar">
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Latest Snapshot</div>
          <div className="kpi-value">{monthRange}</div>
          <div className="kpi-meta">{discos.length} Discos</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Last Refresh</div>
          <div className="kpi-value">
            {lastRefresh ? new Date(lastRefresh).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '—'}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Pipeline Health (7 runs)</div>
          <div className="kpi-value">{pipelineHealthPct != null ? `${pipelineHealthPct}%` : '—'}</div>
          <div className="kpi-meta">success rate</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">DQ Score</div>
          <div className="kpi-value">{dq?.dq_score ?? '—'}</div>
          <div className="kpi-meta">0–100</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Geocode Coverage</div>
          <div className="kpi-value">{geo?.geocode_coverage_pct != null ? `${geo.geocode_coverage_pct}%` : '—'}</div>
          <div className="kpi-meta">valid geom</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Extraction Coverage</div>
          <div className="kpi-value">{geo?.total_latest ?? '—'}</div>
          <div className="kpi-meta">rows in latest snapshot</div>
        </div>
      </div>
      <div className="snapshot-strip">
        <span>Active snapshot: <code>{snapshotRunId ? `${snapshotRunId.slice(0, 8)}…` : '—'}</code></span>
        <span className="chip success">Snapshot</span>
      </div>
    </div>
  );
}
