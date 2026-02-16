/**
 * Central endpoint registry. All URLs use V1 (backend direct, no Next rewrites).
 * API_BASE from NEXT_PUBLIC_API_BASE_URL (default http://localhost:8000). Versioning in one place.
 */
import { V1 } from './apiBase';

export { API_BASE, V1 } from './apiBase';

export const endpoints = {
  healthz: () => `${V1}/healthz`,
  health: () => `${V1}/health`,
  // Snapshot / meta
  metadataFreshness: () => `${V1}/metadata/freshness`,
  metadataCoverage: () => `${V1}/metadata/coverage`,
  dqSummary: (runId?: string) => `${V1}/dq/summary${runId ? `?run_id=${encodeURIComponent(runId)}` : ''}`,
  metricsPipelinePerformance: (runs = 10) => `${V1}/metrics/pipeline/performance?runs=${runs}`,
  // Latest
  latestDiscos: () => `${V1}/latest/discos`,
  latestMonths: (disco?: string) => `${V1}/latest/months${disco ? `?disco_code=${encodeURIComponent(disco)}` : ''}`,
  latestCommitments: (params?: { disco_code?: string; year?: number; month?: string; band?: string; q?: string; limit?: number; offset?: number }) => {
    const p = new URLSearchParams();
    if (params?.disco_code) p.set('disco_code', params.disco_code);
    if (params?.year != null) p.set('year', String(params.year));
    if (params?.month) p.set('month', params.month);
    if (params?.band) p.set('band', params.band);
    if (params?.q) p.set('q', params.q);
    if (params?.limit != null) p.set('limit', String(params.limit));
    if (params?.offset != null) p.set('offset', String(params.offset));
    const q = p.toString();
    return `${V1}/latest/commitments${q ? `?${q}` : ''}`;
  },
  latestMapPoints: (params?: { disco_code?: string; year?: number; month?: string; band?: string }) => {
    const p = params ? new URLSearchParams(params as Record<string, string>) : '';
    return `${V1}/latest/map-points${p && p.toString() ? `?${p}` : ''}`;
  },
  latestFeeder: (feederKey: number) => `${V1}/latest/feeder/${feederKey}`,
  latestSearch: (q: string, limit = 50, offset = 0) => `${V1}/latest/search?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`,
  // Runs
  runs: (limit = 50, offset = 0) => `${V1}/runs?limit=${limit}&offset=${offset}`,
  runDetail: (runId: string) => `${V1}/runs/${runId}`,
  runStages: (runId: string) => `${V1}/runs/${runId}/stages`,
  runEvents: (runId: string, limit = 500, offset = 0) => `${V1}/runs/${runId}/events?limit=${limit}&offset=${offset}`,
  runSnapshot: (runId: string) => `${V1}/runs/${runId}/snapshot`,
  runExecute: (runId: string, mode: string) => `${V1}/runs/${runId}/execute?mode=${mode}`,
  createRun: (force?: boolean) => `${V1}/runs${force ? '?force=true' : ''}`,
  runsReconcile: () => `${V1}/runs/reconcile`,
  runCancel: (runId: string) => `${V1}/runs/${runId}/cancel`,
  schedulerStatus: () => `${V1}/scheduler/status`,
  // Layers
  layersBronzePdfs: (runId?: string, limit = 100, offset = 0) => `${V1}/layers/bronze/pdfs?limit=${limit}&offset=${offset}${runId ? `&run_id=${encodeURIComponent(runId)}` : ''}`,
  layersBronzeArtifacts: (runId?: string, limit = 100, offset = 0) => `${V1}/layers/bronze/artifacts?limit=${limit}&offset=${offset}${runId ? `&run_id=${runId}` : ''}`,
  layersBronzeTables: (params?: { run_id?: string; disco_code?: string; month_name?: string; limit?: number; offset?: number }) => {
    const p = new URLSearchParams();
    if (params?.run_id) p.set('run_id', params.run_id);
    if (params?.disco_code) p.set('disco_code', params.disco_code);
    if (params?.month_name) p.set('month_name', params.month_name);
    if (params?.limit != null) p.set('limit', String(params.limit));
    if (params?.offset != null) p.set('offset', String(params.offset));
    const q = p.toString();
    return `${V1}/layers/bronze/tables${q ? `?${q}` : ''}`;
  },
  layersSilverCommitments: (runId?: string, disco?: string, limit = 100, offset = 0) => `${V1}/layers/silver/commitments?limit=${limit}&offset=${offset}${runId ? `&run_id=${runId}` : ''}${disco ? `&disco_code=${encodeURIComponent(disco)}` : ''}`,
  layersSilverDq: (runId?: string, status?: string, limit = 200, offset = 0) => `${V1}/layers/silver/dq?limit=${limit}&offset=${offset}${runId ? `&run_id=${runId}` : ''}${status ? `&dq_status=${status}` : ''}`,
  layersSilverGeocode: () => `${V1}/layers/silver/geocode`,
  layersGoldDims: () => `${V1}/layers/gold/dims`,
  layersGoldFacts: (params?: { disco_code?: string; date_key?: number; limit?: number; offset?: number }) => {
    const p = new URLSearchParams();
    if (params?.disco_code) p.set('disco_code', params.disco_code);
    if (params?.date_key != null) p.set('date_key', String(params.date_key));
    if (params?.limit != null) p.set('limit', String(params.limit));
    if (params?.offset != null) p.set('offset', String(params.offset));
    const q = p.toString();
    return `${V1}/layers/gold/facts${q ? `?${q}` : ''}`;
  },
  // DQ / Metadata / Metrics / Governance
  dqIssues: (params?: { run_id?: string; status?: string; limit?: number; offset?: number }) => {
    const p = new URLSearchParams();
    if (params?.run_id) p.set('run_id', params.run_id);
    if (params?.status) p.set('status', params.status);
    if (params?.limit != null) p.set('limit', String(params.limit));
    if (params?.offset != null) p.set('offset', String(params.offset));
    const q = p.toString();
    return `${V1}/dq/issues${q ? `?${q}` : ''}`;
  },
  dqRules: () => `${V1}/dq/rules`,
  metadataDatasets: () => `${V1}/metadata/datasets`,
  metadataDatasetSchema: (name: string) => `${V1}/metadata/datasets/${encodeURIComponent(name)}/schema`,
  metadataColumnsDictionary: () => `${V1}/metadata/columns/dictionary`,
  metricsExtractionMethods: () => `${V1}/metrics/extraction/methods`,
  metricsGeocode: () => `${V1}/metrics/geocode`,
  governanceLineage: () => `${V1}/governance/lineage`,
  governanceAudit: () => `${V1}/governance/audit`,
  governancePolicies: () => `${V1}/governance/policies`,
  // Lineage Explorer
  lineageGraph: (params?: { mode?: string; run_id?: string; dataset?: string; layer?: string }) => {
    const p = new URLSearchParams();
    if (params?.mode) p.set('mode', params.mode);
    if (params?.run_id) p.set('run_id', params.run_id);
    if (params?.dataset) p.set('dataset', params.dataset);
    if (params?.layer) p.set('layer', params.layer);
    const q = p.toString();
    return `${V1}/lineage/graph${q ? `?${q}` : ''}`;
  },
  catalogTables: (params?: { layer?: string; dataset?: string }) => {
    const p = new URLSearchParams();
    if (params?.layer) p.set('layer', params.layer);
    if (params?.dataset) p.set('dataset', params.dataset);
    const q = p.toString();
    return `${V1}/catalog/tables${q ? `?${q}` : ''}`;
  },
  metricsPipelineTimeseries: () => `${V1}/metrics/pipeline/timeseries`,
  // Agent
  agentQuery: () => `${V1}/agent/query`,
  // Exports (with current filters in query)
  exportCommitmentsCsv: (params?: { disco?: string; year?: number; month?: string; band?: string }) => {
    const p = new URLSearchParams();
    if (params?.disco) p.set('disco', params.disco);
    if (params?.year != null) p.set('year', String(params.year));
    if (params?.month) p.set('month', params.month || '');
    if (params?.band) p.set('band', params.band || '');
    const q = p.toString();
    return `${V1}/exports/latest/commitments.csv${q ? `?${q}` : ''}`;
  },
  exportCommitmentsParquet: (params?: { disco?: string; year?: number; month?: string; band?: string }) => {
    const p = new URLSearchParams();
    if (params?.disco) p.set('disco', params.disco);
    if (params?.year != null) p.set('year', String(params.year));
    if (params?.month) p.set('month', params.month || '');
    if (params?.band) p.set('band', params.band || '');
    const q = p.toString();
    return `${V1}/exports/latest/commitments.parquet${q ? `?${q}` : ''}`;
  },
  exportMapGeojson: (params?: { disco?: string; year?: number; month?: string; band?: string }) => {
    const p = new URLSearchParams();
    if (params?.disco) p.set('disco', params.disco);
    if (params?.year != null) p.set('year', String(params.year));
    if (params?.month) p.set('month', params.month || '');
    if (params?.band) p.set('band', params.band || '');
    const q = p.toString();
    return `${V1}/exports/latest/map.geojson${q ? `?${q}` : ''}`;
  },
} as const;
