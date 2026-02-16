'use client';

import { ENDPOINT_COVERAGE, COVERAGE_STATS, WIRED_PCT, type CoverageStatus } from '@/lib/endpointCoverage';

function statusBadge(status: CoverageStatus) {
  const cls =
    status === 'wired'
      ? 'bg-emerald-100 text-emerald-800'
      : status === 'stub'
        ? 'bg-amber-100 text-amber-800'
        : status === 'missing'
          ? 'bg-red-100 text-red-800'
          : 'bg-gray-200 text-gray-700';
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded ${cls}`}>{status}</span>;
}

export default function CoveragePage() {
  const byTag = ENDPOINT_COVERAGE.reduce<Record<string, typeof ENDPOINT_COVERAGE>>((acc, e) => {
    if (!acc[e.tag]) acc[e.tag] = [];
    acc[e.tag].push(e);
    return acc;
  }, {});

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold text-primary mb-2">Endpoint Coverage Matrix</h1>
      <p className="text-sm text-[var(--ldv-text-muted)] mb-4">
        Dev-only audit: backend API surface vs UI wiring. Goal: 90% wired.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-6">
        <div className="kpi-card p-3">
          <div className="text-xs text-[var(--ldv-text-muted)]">Total</div>
          <div className="text-lg font-semibold">{COVERAGE_STATS.total}</div>
        </div>
        <div className="kpi-card p-3">
          <div className="text-xs text-[var(--ldv-text-muted)]">Wired</div>
          <div className="text-lg font-semibold text-emerald-700">{COVERAGE_STATS.wired}</div>
        </div>
        <div className="kpi-card p-3">
          <div className="text-xs text-[var(--ldv-text-muted)]">Stub</div>
          <div className="text-lg font-semibold text-amber-700">{COVERAGE_STATS.stub}</div>
        </div>
        <div className="kpi-card p-3">
          <div className="text-xs text-[var(--ldv-text-muted)]">Missing</div>
          <div className="text-lg font-semibold text-red-700">{COVERAGE_STATS.missing}</div>
        </div>
        <div className="kpi-card p-3">
          <div className="text-xs text-[var(--ldv-text-muted)]">Wired %</div>
          <div className="text-lg font-semibold">{WIRED_PCT}%</div>
        </div>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Tag</th>
              <th>Method</th>
              <th>Path</th>
              <th>UI Page</th>
              <th>Status</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {ENDPOINT_COVERAGE.map((e, i) => (
              <tr key={i}>
                <td className="font-medium">{e.tag}</td>
                <td><code className="text-xs">{e.method}</code></td>
                <td><code className="text-xs break-all">{e.path}</code></td>
                <td className="text-sm">{e.uiPage}</td>
                <td>{statusBadge(e.status)}</td>
                <td className="text-xs text-[var(--ldv-text-muted)]">{e.notes ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
