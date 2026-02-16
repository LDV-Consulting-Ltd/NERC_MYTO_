/**
 * Endpoint Coverage Matrix: all backend /v1 endpoints and their UI wiring status.
 * Goal: 90%+ status === "wired". Use /coverage page to audit.
 */
export type CoverageStatus = 'wired' | 'stub' | 'missing' | 'missing backend';

export interface EndpointCoverageItem {
  tag: string;
  method: string;
  path: string;
  uiPage: string;
  status: CoverageStatus;
  notes?: string;
}

export const ENDPOINT_COVERAGE: EndpointCoverageItem[] = [
  // Health
  { tag: 'Health', method: 'GET', path: '/v1/health', uiPage: 'Overview / KPI', status: 'wired' },
  // Snapshot / meta
  { tag: 'Metadata', method: 'GET', path: '/v1/metadata/freshness', uiPage: 'Overview, KPI strip, Metadata', status: 'wired' },
  { tag: 'Metadata', method: 'GET', path: '/v1/metadata/coverage', uiPage: 'Overview, KPI strip, Metadata', status: 'wired' },
  { tag: 'DQ', method: 'GET', path: '/v1/dq/summary', uiPage: 'DQ, Overview, KPI strip', status: 'wired' },
  { tag: 'Metrics', method: 'GET', path: '/v1/metrics/pipeline/performance', uiPage: 'Metrics, Overview, KPI strip', status: 'wired' },
  // Latest
  { tag: 'Latest', method: 'GET', path: '/v1/latest/discos', uiPage: 'Explorer, Map, Discos, Disco profile, Filters', status: 'wired' },
  { tag: 'Latest', method: 'GET', path: '/v1/latest/months', uiPage: 'Explorer, Map, Filters', status: 'wired' },
  { tag: 'Latest', method: 'GET', path: '/v1/latest/commitments', uiPage: 'Explorer, Disco profile', status: 'wired' },
  { tag: 'Latest', method: 'GET', path: '/v1/latest/map-points', uiPage: 'Map, Disco profile', status: 'wired' },
  { tag: 'Latest', method: 'GET', path: '/v1/latest/feeder/{feeder_key}', uiPage: 'Explorer drill-through, Map', status: 'wired' },
  { tag: 'Latest', method: 'GET', path: '/v1/latest/search', uiPage: 'Explorer (search)', status: 'wired' },
  { tag: 'Latest', method: 'GET', path: '/v1/latest/feeders', uiPage: 'Explorer (optional list)', status: 'stub', notes: 'TODO: wire if backend exposes list' },
  // Runs
  { tag: 'Runs', method: 'GET', path: '/v1/runs', uiPage: 'Runs, Overview, Pipeline', status: 'wired' },
  { tag: 'Runs', method: 'POST', path: '/v1/runs', uiPage: 'Pipeline, Runs', status: 'wired' },
  { tag: 'Runs', method: 'GET', path: '/v1/runs/{run_id}', uiPage: 'Run detail', status: 'wired' },
  { tag: 'Runs', method: 'GET', path: '/v1/runs/{run_id}/stages', uiPage: 'Run detail (stage DAG)', status: 'wired' },
  { tag: 'Runs', method: 'GET', path: '/v1/runs/{run_id}/events', uiPage: 'Run detail (logs)', status: 'wired' },
  { tag: 'Runs', method: 'POST', path: '/v1/runs/{run_id}/execute?mode=full', uiPage: 'Pipeline', status: 'wired' },
  { tag: 'Scheduler', method: 'GET', path: '/v1/scheduler/status', uiPage: 'Pipeline', status: 'wired', notes: 'TODO: backend may not exist' },
  // Layers
  { tag: 'Layers', method: 'GET', path: '/v1/layers/bronze/pdfs', uiPage: 'Layers > Bronze', status: 'wired' },
  { tag: 'Layers', method: 'GET', path: '/v1/layers/bronze/artifacts', uiPage: 'Layers > Bronze', status: 'wired' },
  { tag: 'Layers', method: 'GET', path: '/v1/layers/bronze/tables', uiPage: 'Layers > Bronze', status: 'wired' },
  { tag: 'Layers', method: 'GET', path: '/v1/layers/silver/commitments', uiPage: 'Layers > Silver', status: 'wired' },
  { tag: 'Layers', method: 'GET', path: '/v1/layers/silver/dq', uiPage: 'Layers > Silver', status: 'wired' },
  { tag: 'Layers', method: 'GET', path: '/v1/layers/silver/geocode', uiPage: 'Layers > Silver', status: 'wired' },
  { tag: 'Layers', method: 'GET', path: '/v1/layers/gold/dims', uiPage: 'Layers > Gold', status: 'wired' },
  { tag: 'Layers', method: 'GET', path: '/v1/layers/gold/facts', uiPage: 'Layers > Gold', status: 'wired' },
  // Metadata
  { tag: 'Metadata', method: 'GET', path: '/v1/metadata/datasets', uiPage: 'Metadata, Architecture', status: 'wired' },
  { tag: 'Metadata', method: 'GET', path: '/v1/metadata/datasets/{name}/schema', uiPage: 'Metadata', status: 'wired' },
  { tag: 'Metadata', method: 'GET', path: '/v1/metadata/columns/dictionary', uiPage: 'Metadata', status: 'wired' },
  // DQ
  { tag: 'DQ', method: 'GET', path: '/v1/dq/issues', uiPage: 'DQ, Run detail', status: 'wired' },
  { tag: 'DQ', method: 'GET', path: '/v1/dq/rules', uiPage: 'DQ', status: 'wired' },
  // Governance
  { tag: 'Governance', method: 'GET', path: '/v1/governance/audit', uiPage: 'Governance', status: 'wired' },
  { tag: 'Governance', method: 'GET', path: '/v1/governance/lineage', uiPage: 'Governance, Architecture', status: 'wired' },
  { tag: 'Governance', method: 'GET', path: '/v1/governance/policies', uiPage: 'Governance', status: 'wired', notes: 'TODO: backend may not exist' },
  // Metrics
  { tag: 'Metrics', method: 'GET', path: '/v1/metrics/extraction/methods', uiPage: 'Metrics', status: 'wired' },
  { tag: 'Metrics', method: 'GET', path: '/v1/metrics/geocode', uiPage: 'Metrics, KPI strip', status: 'wired' },
  { tag: 'Metrics', method: 'GET', path: '/v1/metrics/pipeline/timeseries', uiPage: 'Metrics (trend)', status: 'stub', notes: 'TODO: wire trend chart if backend exists' },
  // Agent
  { tag: 'Agent', method: 'POST', path: '/v1/agent/query', uiPage: 'Agent', status: 'wired' },
  // Exports
  { tag: 'Exports', method: 'GET', path: '/v1/exports/latest/commitments.csv', uiPage: 'Explorer, DQ', status: 'wired' },
  { tag: 'Exports', method: 'GET', path: '/v1/exports/latest/commitments.parquet', uiPage: 'Explorer', status: 'wired' },
  { tag: 'Exports', method: 'GET', path: '/v1/exports/latest/map.geojson', uiPage: 'Map', status: 'wired' },
];

function countByStatus(status: CoverageStatus) {
  return ENDPOINT_COVERAGE.filter((e) => e.status === status).length;
}

export const COVERAGE_STATS = {
  total: ENDPOINT_COVERAGE.length,
  wired: countByStatus('wired'),
  stub: countByStatus('stub'),
  missing: countByStatus('missing'),
  missingBackend: countByStatus('missing backend'),
};

export const WIRED_PCT = COVERAGE_STATS.total
  ? Math.round((COVERAGE_STATS.wired / COVERAGE_STATS.total) * 100)
  : 0;
