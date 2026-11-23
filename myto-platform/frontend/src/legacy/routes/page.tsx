'use client';

import Link from 'next/link';
import { useSnapshotMeta, useRuns, useMetricsPipeline } from '@/lib/hooks';
import RunHistoryTable from '@/components/RunHistoryTable';
import { formatPct, formatDate, formatNumber } from '@/lib/format';
import { FreshnessBadge } from '@/components/TrustBadges';

export default function OverviewPage() {
  const { data: meta, isLoading: metaLoading } = useSnapshotMeta();
  const { data: runsRaw, isLoading: runsLoading } = useRuns(10, 0);
  const runs = Array.isArray(runsRaw) ? runsRaw : [];
  const { data: pipelineMetrics } = useMetricsPipeline(10);

  const isEmpty =
    !metaLoading &&
    (meta?.disco_count == null || meta.disco_count === 0) &&
    (meta?.total_rows == null || meta.total_rows === 0);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[var(--ldv-primary)] tracking-tight">
          National Command Center
        </h1>
        <p className="text-sm text-[var(--ldv-text-muted)] mt-1">
          Electricity data infrastructure — coverage, freshness, trust, and platform health.
        </p>
      </div>

      {/* ROW 1 — Authority Snapshot Cards */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--ldv-text-muted)] mb-3">
          Authority snapshot
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="kpi-card p-4">
            <div className="text-xs font-medium text-[var(--ldv-text-muted)]">National data coverage</div>
            <div className="text-lg font-semibold text-[var(--ldv-primary)] mt-1">
              {metaLoading ? '…' : isEmpty ? '—' : `${meta?.disco_count ?? 0} DisCos`}
            </div>
            <div className="text-xs text-[var(--ldv-text-muted)] mt-0.5">
              {metaLoading ? '…' : isEmpty ? 'No data yet' : `${meta?.month_range ?? '—'} coverage`}
            </div>
          </div>
          <div className="kpi-card p-4">
            <div className="text-xs font-medium text-[var(--ldv-text-muted)]">Latest snapshot freshness</div>
            <div className="text-lg font-semibold text-[var(--ldv-primary)] mt-1">
              {metaLoading ? '…' : isEmpty ? '—' : formatDate(meta?.refreshed_at ?? null)}
            </div>
            {!metaLoading && !isEmpty && meta?.refreshed_at && (
              <div className="mt-1.5">
                <FreshnessBadge iso={meta.refreshed_at} />
              </div>
            )}
          </div>
          <div className="kpi-card p-4">
            <div className="text-xs font-medium text-[var(--ldv-text-muted)]">National DQ score</div>
            <div className="text-lg font-semibold text-[var(--ldv-primary)] mt-1">
              {metaLoading ? '…' : isEmpty ? '—' : formatPct(meta?.dq_score, 0)}
            </div>
          </div>
          <div className="kpi-card p-4">
            <div className="text-xs font-medium text-[var(--ldv-text-muted)]">Geospatial coverage</div>
            <div className="text-lg font-semibold text-[var(--ldv-primary)] mt-1">
              {metaLoading ? '…' : isEmpty ? '—' : formatPct(meta?.geocode_coverage_pct, 1)}
            </div>
          </div>
          <div className="kpi-card p-4">
            <div className="text-xs font-medium text-[var(--ldv-text-muted)]">Extraction coverage</div>
            <div className="text-lg font-semibold text-[var(--ldv-primary)] mt-1">
              {metaLoading ? '…' : isEmpty ? '—' : formatPct(meta?.extraction_coverage_pct, 1)}
            </div>
          </div>
          <div className="kpi-card p-4">
            <div className="text-xs font-medium text-[var(--ldv-text-muted)]">Pipeline health</div>
            <div className="text-lg font-semibold text-[var(--ldv-primary)] mt-1">
              {metaLoading ? '…' : isEmpty ? '—' : formatPct(meta?.pipeline_success_rate, 0)}
            </div>
          </div>
        </div>
      </section>

      {/* ROW 2 — Two columns */}
      <section className="grid md:grid-cols-2 gap-6 mb-8">
        {/* LEFT: National Electricity Coverage Intelligence */}
        <div className="border border-[var(--ldv-border)] rounded-lg bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--ldv-border)] bg-[var(--ldv-surface)]">
            <h2 className="text-base font-semibold text-[var(--ldv-primary)]">
              National electricity coverage intelligence
            </h2>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <div className="text-xs font-medium text-[var(--ldv-text-muted)] mb-1">DisCo coverage</div>
              <p className="text-sm text-[var(--ldv-text-primary)]">
                {metaLoading ? '…' : isEmpty ? 'Awaiting first ingestion' : `${meta?.disco_count ?? 0} Distribution Companies`}
              </p>
            </div>
            <div>
              <div className="text-xs font-medium text-[var(--ldv-text-muted)] mb-1">Data volume</div>
              <p className="text-sm font-semibold text-[var(--ldv-primary)]">
                {metaLoading ? '…' : isEmpty ? '—' : formatNumber(meta?.total_rows ?? 0)}
              </p>
              <p className="text-xs text-[var(--ldv-text-muted)]">commitment records in latest snapshot</p>
            </div>
            <div>
              <div className="text-xs font-medium text-[var(--ldv-text-muted)] mb-1">Month coverage</div>
              <p className="text-sm text-[var(--ldv-text-primary)]">
                {metaLoading ? '…' : meta?.month_range ?? '—'}
              </p>
            </div>
            <div className="pt-2">
              <Link href="/map" className="text-sm font-medium text-[var(--ldv-support)] hover:underline">
                View national map →
              </Link>
              <span className="mx-2 text-[var(--ldv-border)]">|</span>
              <Link href="/explorer" className="text-sm font-medium text-[var(--ldv-support)] hover:underline">
                Explore data →
              </Link>
            </div>
          </div>
        </div>

        {/* RIGHT: Platform Health Intelligence */}
        <div className="border border-[var(--ldv-border)] rounded-lg bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--ldv-border)] bg-[var(--ldv-surface)]">
            <h2 className="text-base font-semibold text-[var(--ldv-primary)]">
              Platform health intelligence
            </h2>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <div className="text-xs font-medium text-[var(--ldv-text-muted)] mb-1">Pipeline success rate (recent)</div>
              <p className="text-sm font-semibold text-[var(--ldv-primary)]">
                {metaLoading ? '…' : isEmpty ? '—' : formatPct(meta?.pipeline_success_rate, 0)}
              </p>
            </div>
            <div>
              <div className="text-xs font-medium text-[var(--ldv-text-muted)] mb-1">DQ trend</div>
              <p className="text-sm text-[var(--ldv-text-primary)]">
                {meta?.dq_score != null ? `Current score: ${formatPct(meta.dq_score, 0)}` : '—'}
              </p>
              <p className="text-xs text-[var(--ldv-text-muted)]">See Data Quality for issues and trend.</p>
            </div>
            <div>
              <div className="text-xs font-medium text-[var(--ldv-text-muted)] mb-1">Stage performance</div>
              <ul className="text-sm space-y-0.5">
                {(pipelineMetrics?.stages ?? []).slice(0, 5).map((s: { stage_name?: string; success_rate?: number }) => (
                  <li key={s.stage_name}>
                    <span className="font-mono text-xs">{s.stage_name}</span>{' '}
                    {s.success_rate != null ? formatPct(s.success_rate, 0) : '—'}
                  </li>
                ))}
                {(!pipelineMetrics?.stages || pipelineMetrics.stages.length === 0) && (
                  <li className="text-[var(--ldv-text-muted)]">No stage metrics yet</li>
                )}
              </ul>
            </div>
            <div className="pt-2">
              <Link href="/pipeline" className="text-sm font-medium text-[var(--ldv-support)] hover:underline">
                Pipeline operations →
              </Link>
              <span className="mx-2 text-[var(--ldv-border)]">|</span>
              <Link href="/metrics" className="text-sm font-medium text-[var(--ldv-support)] hover:underline">
                Metrics & observability →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ROW 3 — National Data Activity Timeline */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--ldv-text-muted)] mb-3">
          National data activity timeline
        </h2>
        <div className="border border-[var(--ldv-border)] rounded-lg bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--ldv-border)] bg-[var(--ldv-surface)] flex justify-between items-center">
            <span className="text-sm font-semibold text-[var(--ldv-primary)]">Last pipeline runs</span>
            <Link href="/runs" className="text-sm text-[var(--ldv-support)] hover:underline">
              View all
            </Link>
          </div>
          <div className="min-h-[120px]">
            {runsLoading && (
              <p className="p-4 text-sm text-[var(--ldv-text-muted)]">Loading…</p>
            )}
            {!runsLoading && runs.length === 0 && (
              <p className="p-4 text-sm text-[var(--ldv-text-muted)]">
                No pipeline runs yet. Start a run from Pipeline Operations.
              </p>
            )}
            {!runsLoading && runs.length > 0 && (
              <RunHistoryTable runs={runs} limit={8} showViewAll />
            )}
          </div>
          <div className="px-4 py-2 border-t border-[var(--ldv-border)] bg-[var(--ldv-surface)]/50 text-xs text-[var(--ldv-text-muted)]">
            Promotions, DQ alerts, and geocode anomalies appear in run details and Data Quality.
          </div>
        </div>
      </section>
    </div>
  );
}
