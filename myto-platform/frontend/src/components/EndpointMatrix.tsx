'use client';

import { COVERAGE_STATS, ENDPOINT_COVERAGE, WIRED_PCT, type CoverageStatus } from '@/lib/endpointCoverage';
import { MetricTile } from '@/components/preview/ui';

function statusClass(status: CoverageStatus) {
  if (status === 'wired') return 'pc-pill pc-pill-ok';
  if (status === 'stub') return 'pc-pill pc-pill-warn';
  if (status === 'missing') return 'pc-pill pc-pill-danger';
  return 'pc-pill';
}

export default function EndpointMatrix() {
  return (
    <section aria-labelledby="endpoint-matrix">
      <h2 id="endpoint-matrix">Endpoint matrix</h2>
      <p className="pc-lede">Backend routes and whether this console calls them.</p>
      <section className="pc-metrics">
        <MetricTile label="Total" value={String(COVERAGE_STATS.total)} />
        <MetricTile label="Wired" value={String(COVERAGE_STATS.wired)} />
        <MetricTile label="Stub" value={String(COVERAGE_STATS.stub)} />
        <MetricTile label="Missing" value={String(COVERAGE_STATS.missing)} />
        <MetricTile label="Wired share" value={`${WIRED_PCT}%`} />
      </section>
      <div className="pc-table-wrap">
        <table className="pc-table">
          <caption className="pc-sr">Endpoint coverage</caption>
          <thead>
            <tr>
              <th>Tag</th>
              <th>Method</th>
              <th>Path</th>
              <th>Screen</th>
              <th>Status</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {ENDPOINT_COVERAGE.map((entry) => (
              <tr key={`${entry.method}-${entry.path}`}>
                <td>{entry.tag}</td>
                <td><code>{entry.method}</code></td>
                <td><code>{entry.path}</code></td>
                <td>{entry.uiPage}</td>
                <td><span className={statusClass(entry.status)}>{entry.status}</span></td>
                <td>{entry.notes ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
