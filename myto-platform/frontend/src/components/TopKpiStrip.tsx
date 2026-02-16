'use client';

import { useSnapshotMeta } from '@/lib/hooks';
import { formatDate, formatPct } from '@/lib/format';

export default function TopKpiStrip() {
  const { data, isLoading, error } = useSnapshotMeta();

  if (error) {
    return (
      <div className="bg-amber-50 border-b border-[var(--ldv-border)] px-4 py-2 text-sm text-amber-800">
        Could not load snapshot KPIs. Check API connection.
      </div>
    );
  }

  return (
    <div className="bg-surface border-b border-[var(--ldv-border)] px-4 py-3">
      <div className="flex flex-wrap gap-4 items-center">
        <div className="kpi-card min-w-[140px]">
          <div className="text-xs font-medium text-[var(--ldv-text-muted)]">Latest Snapshot</div>
          <div className="text-sm font-semibold text-primary">
            {isLoading ? '…' : data?.month_range ?? '—'}
          </div>
          {data && (
            <div className="text-xs text-[var(--ldv-text-muted)]">
              Run {data.run_id ? `${String(data.run_id).slice(0, 8)}…` : '—'}
            </div>
          )}
        </div>
        <div className="kpi-card min-w-[140px]">
          <div className="text-xs font-medium text-[var(--ldv-text-muted)]">Last Refresh</div>
          <div className="text-sm font-semibold text-primary">
            {isLoading ? '…' : formatDate(data?.refreshed_at ?? null)}
          </div>
        </div>
        <div className="kpi-card min-w-[100px]">
          <div className="text-xs font-medium text-[var(--ldv-text-muted)]">DQ Score</div>
          <div className="text-sm font-semibold text-primary">
            {isLoading ? '…' : (data?.dq_score != null ? formatPct(data.dq_score, 0) : '—')}
          </div>
        </div>
        <div className="kpi-card min-w-[120px]">
          <div className="text-xs font-medium text-[var(--ldv-text-muted)]">Geocode Coverage</div>
          <div className="text-sm font-semibold text-primary">
            {isLoading ? '…' : formatPct(data?.geocode_coverage_pct, 1)}
          </div>
        </div>
        <div className="kpi-card min-w-[120px]">
          <div className="text-xs font-medium text-[var(--ldv-text-muted)]">Extraction Coverage</div>
          <div className="text-sm font-semibold text-primary">
            {isLoading ? '…' : (data?.total_rows != null ? data.total_rows.toLocaleString() : '—')}
          </div>
        </div>
        <div className="kpi-card min-w-[120px]">
          <div className="text-xs font-medium text-[var(--ldv-text-muted)]">Pipeline Health</div>
          <div className="text-sm font-semibold text-primary">
            {isLoading ? '…' : formatPct(data?.pipeline_success_rate, 0)}
          </div>
        </div>
      </div>
    </div>
  );
}
