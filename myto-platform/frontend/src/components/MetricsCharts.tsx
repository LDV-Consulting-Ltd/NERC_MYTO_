'use client';

import type { PipelineStageMetric } from '@/lib/types';
import { formatNumber } from '@/lib/format';

interface MetricsChartsProps {
  stages: PipelineStageMetric[];
  geocode?: { geocode_coverage_pct?: number; cache_entries?: number } | null;
}

const STAGE_ORDER = ['discover', 'download', 'extract', 'silver_transform', 'silver_geocode', 'gold_build', 'promote_latest'];

export default function MetricsCharts({ stages, geocode }: MetricsChartsProps) {
  const sorted = [...stages].sort(
    (a, b) => STAGE_ORDER.indexOf(a.stage_name) - STAGE_ORDER.indexOf(b.stage_name)
  );
  const maxDuration = Math.max(...sorted.map((s) => s.duration_ms ?? 0), 1);

  return (
    <div className="space-y-6">
      <section>
        <h3 className="font-semibold text-primary mb-3">Stage duration (last run)</h3>
        <div className="space-y-2">
          {sorted.map((s) => (
            <div key={s.stage_name} className="flex items-center gap-3">
              <span className="w-40 text-sm font-medium truncate">{s.stage_name}</span>
              <div className="flex-1 h-6 bg-surface rounded overflow-hidden">
                <div
                  className="h-full bg-accent rounded"
                  style={{
                    width: `${((s.duration_ms ?? 0) / maxDuration) * 100}%`,
                    minWidth: (s.duration_ms ?? 0) > 0 ? 4 : 0,
                  }}
                />
              </div>
              <span className="text-sm text-[var(--ldv-text-muted)] w-20 text-right">
                {formatNumber(s.duration_ms)} ms
              </span>
              <span
                className={
                  s.status === 'success'
                    ? 'chip-success'
                    : s.status === 'failed'
                      ? 'chip-failed'
                      : 'chip-running'
                }
              >
                {s.status}
              </span>
            </div>
          ))}
        </div>
      </section>
      {geocode != null && (
        <section>
          <h3 className="font-semibold text-primary mb-3">Geocode</h3>
          <div className="flex gap-4">
            <div className="kpi-card min-w-[140px]">
              <div className="text-xs text-[var(--ldv-text-muted)]">Coverage</div>
              <div className="text-xl font-semibold text-primary">
                {geocode.geocode_coverage_pct != null ? `${geocode.geocode_coverage_pct}%` : '—'}
              </div>
            </div>
            <div className="kpi-card min-w-[140px]">
              <div className="text-xs text-[var(--ldv-text-muted)]">Cache entries</div>
              <div className="text-xl font-semibold text-primary">
                {formatNumber(geocode.cache_entries)}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
