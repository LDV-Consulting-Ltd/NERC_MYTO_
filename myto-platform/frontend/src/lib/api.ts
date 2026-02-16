import { endpoints } from './endpoints';
import type { ApiEnvelope } from './types';

export type { ApiEnvelope } from './types';

/** Thrown by request() on non-ok response. Includes debug fields for Copy debug info. */
export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly url: string,
    public readonly method: string,
    public readonly responseBody: string
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const method = options?.method ?? 'GET';
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  const text = await res.text();
  if (!res.ok) {
    let message = text || `${res.status} ${res.statusText}`;
    try {
      const j = JSON.parse(text) as { detail?: string | unknown; message?: string };
      if (typeof j.detail === 'string') message = j.detail;
      else if (typeof j.message === 'string') message = j.message;
      else if (j.detail != null) message = JSON.stringify(j.detail);
    } catch {
      /* use message from text */
    }
    throw new ApiRequestError(message, res.status, url, method, text);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

/** Unwrap envelope { data, meta } */
export async function apiEnvelope<T>(url: string, options?: RequestInit): Promise<ApiEnvelope<T>> {
  return request<ApiEnvelope<T>>(url, options);
}

// ---- Health ----
export async function getHealth(): Promise<{ status?: string }> {
  return request(endpoints.health());
}

/** Returns { ok: true } when backend responds 200; { ok: false, error } otherwise. For UI status pill. */
export async function checkHealth(): Promise<{ ok: true } | { ok: false; error: string }> {
  return checkHealthzWithUrl(endpoints.healthz());
}

/**
 * Lightweight connectivity check (hits /v1/healthz). Use for "Backend Online/Offline".
 * Online if status 200; Offline on network error or non-200.
 */
export async function checkHealthzWithUrl(healthzUrl: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const r = await fetch(healthzUrl, { method: 'GET' });
    if (r.ok) return { ok: true };
    const t = await r.text();
    return { ok: false, error: `${r.status} ${t.slice(0, 200)}` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

/**
 * Dynamic health check using explicit URL (legacy name). Prefer checkHealthzWithUrl for connectivity.
 * For Pipeline page: use healthz URL for Online/Offline; use health URL for detailed "DB degraded" if needed.
 */
export async function checkHealthWithUrl(healthUrl: string): Promise<{ ok: true } | { ok: false; error: string }> {
  return checkHealthzWithUrl(healthUrl);
}

/**
 * Detailed health (GET /v1/health). Returns parsed body with status, db. Use after healthz is ok to show "DB degraded".
 */
export async function getDetailedHealth(healthUrl: string): Promise<{ status: string; db?: string; error?: string } | null> {
  try {
    const r = await fetch(healthUrl, { method: 'GET' });
    if (!r.ok) return null;
    const j = await r.json() as { status?: string; db?: string; error?: string };
    return { status: j.status ?? 'unknown', db: j.db, error: j.error };
  } catch {
    return null;
  }
}

// ---- Snapshot meta (parallel) ----
export async function getSnapshotMeta(): Promise<{
  run_id: string | null;
  refreshed_at: string | null;
  disco_count: number;
  month_range: string;
  total_rows: number;
  dq_score: number;
  geocode_coverage_pct: number;
  extraction_coverage_pct: number;
  pipeline_success_rate: number;
}> {
  const [freshness, dq, coverage, perf] = await Promise.allSettled([
    request<{ data?: { latest_run_id?: string; refreshed_at?: string; disco_count?: number; month_range?: string; total_rows?: number } }>(endpoints.metadataFreshness()).then(r => r.data ?? r),
    request<ApiEnvelope<{ dq_score?: number; total_records?: number }>>(endpoints.dqSummary()).then(r => r.data ?? r),
    request<ApiEnvelope<{ geocode_coverage_pct?: number; extraction_coverage_pct?: number; total_records?: number }>>(endpoints.metadataCoverage()).then(r => r.data ?? r),
    request<ApiEnvelope<{ success_rate?: number } | unknown[]>>(endpoints.metricsPipelinePerformance(10)).then(r => (Array.isArray((r as ApiEnvelope<unknown[]>).data) ? {} : ((r as ApiEnvelope<{ success_rate?: number }>).data ?? {}))),
  ]);
  const f = freshness.status === 'fulfilled' && freshness.value ? (typeof freshness.value === 'object' && 'data' in freshness.value ? (freshness.value as { data?: { latest_run_id?: string; refreshed_at?: string; disco_count?: number; month_range?: string; total_rows?: number } }).data : freshness.value) : {};
  const d = dq.status === 'fulfilled' && dq.value ? (typeof dq.value === 'object' && 'data' in dq.value ? (dq.value as ApiEnvelope<{ dq_score?: number }>).data : dq.value) : {};
  const c = coverage.status === 'fulfilled' && coverage.value ? (typeof coverage.value === 'object' && 'data' in coverage.value ? (coverage.value as ApiEnvelope<{ geocode_coverage_pct?: number; extraction_coverage_pct?: number }>).data : coverage.value) : {};
  const p = perf.status === 'fulfilled' && perf.value && typeof perf.value === 'object' && 'success_rate' in perf.value ? (perf.value as { success_rate?: number }) : {};
  return {
    run_id: (f as { latest_run_id?: string })?.latest_run_id ?? null,
    refreshed_at: (f as { refreshed_at?: string })?.refreshed_at ?? null,
    disco_count: (f as { disco_count?: number })?.disco_count ?? 0,
    month_range: (f as { month_range?: string })?.month_range ?? '—',
    total_rows: (f as { total_rows?: number })?.total_rows ?? 0,
    dq_score: (d as { dq_score?: number })?.dq_score ?? 0,
    geocode_coverage_pct: (c as { geocode_coverage_pct?: number })?.geocode_coverage_pct ?? 0,
    extraction_coverage_pct: (c as { extraction_coverage_pct?: number })?.extraction_coverage_pct ?? 0,
    pipeline_success_rate: (p as { success_rate?: number })?.success_rate ?? 0,
  };
}

// ---- Latest ----
export async function getLatestDiscos(): Promise<{ discos: string[] }> {
  const r = await apiEnvelope<string[]>(endpoints.latestDiscos());
  return { discos: Array.isArray(r.data) ? r.data : [] };
}

export async function getLatestMonths(disco?: string): Promise<{ months: { year: number; month_name: string }[] }> {
  const r = await apiEnvelope<{ year: number; month_name: string }[]>(endpoints.latestMonths(disco));
  const raw = Array.isArray(r.data) ? r.data : [];
  return { months: raw.map(m => (typeof m === 'object' && m && 'year' in m && 'month_name' in m ? m : { year: 0, month_name: String(m) })) };
}

export async function getLatestCommitments(params?: {
  disco_code?: string;
  year?: number;
  month?: string;
  band?: string;
  q?: string;
  limit?: number;
  offset?: number;
}): Promise<{ commitments: import('@/lib/types').CommitmentRow[]; meta?: ApiEnvelope<unknown>['meta'] }> {
  const url = endpoints.latestCommitments({
    disco_code: params?.disco_code,
    year: params?.year,
    month: params?.month,
    band: params?.band,
    q: params?.q,
    limit: params?.limit ?? 500,
    offset: params?.offset ?? 0,
  });
  const r = await apiEnvelope<import('@/lib/types').CommitmentRow[]>(url);
  return { commitments: Array.isArray(r.data) ? r.data : [], meta: r.meta };
}

export async function getLatestMapPoints(params?: { disco_code?: string; year?: number; month?: string; band?: string }): Promise<{ type: string; features: import('@/lib/types').MapPointFeature[] }> {
  const url = endpoints.latestMapPoints(params);
  const r = await request<ApiEnvelope<{ type?: string; features?: import('@/lib/types').MapPointFeature[] }> | { type: string; features: import('@/lib/types').MapPointFeature[] }>(url);
  if (r && typeof r === 'object' && 'features' in r) return r as { type: string; features: import('@/lib/types').MapPointFeature[] };
  const d = (r as ApiEnvelope<{ type?: string; features?: import('@/lib/types').MapPointFeature[] }>)?.data;
  return { type: 'FeatureCollection', features: (d && Array.isArray(d.features)) ? d.features : [] };
}

export async function getLatestFeeder(feederKey: number): Promise<import('@/lib/types').FeederDetail> {
  const r = await apiEnvelope<import('@/lib/types').FeederDetail>(endpoints.latestFeeder(feederKey));
  return r.data as import('@/lib/types').FeederDetail;
}

export async function getLatestSearch(q: string, limit = 50, offset = 0): Promise<import('@/lib/types').CommitmentRow[]> {
  const r = await apiEnvelope<import('@/lib/types').CommitmentRow[]>(endpoints.latestSearch(q, limit, offset));
  return Array.isArray(r.data) ? r.data : [];
}

// ---- Runs ----
export async function getRuns(limit = 50, offset = 0): Promise<import('@/lib/types').RunSummary[]> {
  const r = await apiEnvelope<import('@/lib/types').RunSummary[]>(endpoints.runs(limit, offset));
  return Array.isArray(r?.data) ? r.data : [];
}

export async function createRun(notes?: string, source_root_url?: string, force = false): Promise<import('@/lib/types').RunSummary> {
  const r = await request<ApiEnvelope<import('@/lib/types').RunSummary> & { run_id?: string }>(endpoints.createRun(force), {
    method: 'POST',
    body: JSON.stringify({ notes: notes || null, source_root_url: source_root_url || null }),
  });
  const envelope = r as ApiEnvelope<import('@/lib/types').RunSummary>;
  const run = envelope?.data ?? (r as import('@/lib/types').RunSummary);
  const runId = typeof run?.run_id === 'string' ? run.run_id : (r as { run_id?: string })?.run_id;
  if (!runId) throw new Error('Invalid run response: missing run_id');
  return {
    run_id: runId,
    started_at: run?.started_at ?? new Date().toISOString(),
    finished_at: run?.finished_at ?? null,
    status: run?.status ?? 'running',
    source_root_url: run?.source_root_url ?? null,
    notes: run?.notes ?? null,
    heartbeat_at: run && typeof run === 'object' && 'heartbeat_at' in run ? (run as { heartbeat_at?: string | null }).heartbeat_at : undefined,
  } as import('@/lib/types').RunSummary;
}

/** 409 response detail when a run is already in progress */
export type RunInProgressDetail = { error: string; run_id: string; message: string };

export async function reconcileRuns(): Promise<{ reconciled: string[]; count: number }> {
  const r = await apiEnvelope<{ reconciled: string[]; count: number }>(endpoints.runsReconcile(), { method: 'POST' });
  return r.data ?? { reconciled: [], count: 0 };
}

export async function cancelRun(runId: string): Promise<unknown> {
  return request(endpoints.runCancel(runId), { method: 'POST' });
}

export async function getRun(runId: string): Promise<import('@/lib/types').RunDetail> {
  const r = await apiEnvelope<import('@/lib/types').RunDetail>(endpoints.runDetail(runId));
  return r.data as import('@/lib/types').RunDetail;
}

export async function getRunStages(runId: string): Promise<{ run_id: string; stages: import('@/lib/types').StageInfo[] }> {
  const r = await apiEnvelope<{ stages: import('@/lib/types').StageInfo[] }>(endpoints.runStages(runId));
  return { run_id: runId, stages: r.data?.stages ?? [] };
}

export async function getRunEvents(runId: string, limit = 500, offset = 0): Promise<{ run_id: string; events: import('@/lib/types').RunEvent[] }> {
  const r = await apiEnvelope<import('@/lib/types').RunEvent[]>(endpoints.runEvents(runId, limit, offset));
  return { run_id: runId, events: Array.isArray(r.data) ? r.data : [] };
}

export type RunSnapshot = {
  run_id: string;
  pdfs: { pdf_url: string; title: string | null; disco_code: string | null; month_name: string | null; year: number | null; pdf_filename: string | null }[];
  artifacts_count: number;
  tables_count: number;
  table_samples: { pdf_url: string; page_no: number; table_index: number; table_name: string; method: string | null; row_count: number; sample_rows: unknown[] }[];
  silver_commitments_count: number;
  silver_sample: { disco_code: string; month_name: string; year: number; band: string | null; feeder_name: string | null; feeder_location: string | null; major_users: string | null; min_supply_hours: number | null }[];
  gold_facts_count: number;
  gold_sample: { run_id: string; date_key: number; disco_code: string; feeder_name: string | null; band: string | null; min_supply_hours: number | null; source_pdf_url: string | null }[];
};

export async function getRunSnapshot(runId: string): Promise<RunSnapshot> {
  const r = await apiEnvelope<RunSnapshot>(endpoints.runSnapshot(runId));
  return r.data as RunSnapshot;
}

export async function runExecute(runId: string, mode: string): Promise<unknown> {
  return request(endpoints.runExecute(runId, mode), { method: 'POST' });
}

export async function getSchedulerStatus(): Promise<{
  enabled?: boolean;
  next_run?: string | null;
  last_run?: string | null;
}> {
  try {
    const r = await request<{ data?: { enabled?: boolean; next_run?: string; last_run?: string } }>(endpoints.schedulerStatus());
    const d = (r as { data?: { enabled?: boolean; next_run?: string; last_run?: string } })?.data;
    return {
      enabled: d?.enabled ?? false,
      next_run: d?.next_run ?? null,
      last_run: d?.last_run ?? null,
    };
  } catch {
    return { enabled: false, next_run: null, last_run: null };
  }
}

// ---- DQ ----
export async function getDqSummary(runId?: string): Promise<import('@/lib/types').DqSummary> {
  const r = await apiEnvelope<import('@/lib/types').DqSummary>(endpoints.dqSummary(runId));
  return r.data as import('@/lib/types').DqSummary;
}

export async function getDqIssues(params?: { run_id?: string; status?: string; limit?: number; offset?: number }): Promise<{ issues: import('@/lib/types').DqIssue[] }> {
  const r = await apiEnvelope<import('@/lib/types').DqIssue[]>(endpoints.dqIssues(params));
  return { issues: Array.isArray(r.data) ? r.data : [] };
}

export async function getDqRules(): Promise<{ rules?: unknown[] }> {
  try {
    const r = await request<ApiEnvelope<unknown[]>>(endpoints.dqRules());
    const d = (r as ApiEnvelope<unknown[]>)?.data;
    return { rules: Array.isArray(d) ? d : [] };
  } catch {
    return { rules: [] };
  }
}

// ---- Metadata ----
export async function getMetadataDatasets(): Promise<{ datasets: import('@/lib/types').DatasetMeta[] }> {
  const r = await apiEnvelope<import('@/lib/types').DatasetMeta[]>(endpoints.metadataDatasets());
  return { datasets: Array.isArray(r.data) ? r.data : [] };
}

export async function getMetadataDatasetSchema(name: string): Promise<{ name: string; columns: unknown[] }> {
  const r = await apiEnvelope<{ name: string; columns: unknown[] }>(endpoints.metadataDatasetSchema(name));
  return r.data as { name: string; columns: unknown[] };
}

export async function getMetadataColumnsDictionary(): Promise<{ columns: unknown[] }> {
  const r = await request<ApiEnvelope<unknown[]>>(endpoints.metadataColumnsDictionary());
  return { columns: Array.isArray(r.data) ? r.data : [] };
}

// ---- Metrics ----
export async function getMetricsPipeline(runs = 10): Promise<{ stages: import('@/lib/types').PipelineStageMetric[] }> {
  const r = await apiEnvelope<import('@/lib/types').PipelineStageMetric[] | { stages: import('@/lib/types').PipelineStageMetric[] }>(endpoints.metricsPipelinePerformance(runs));
  const d = r.data;
  if (Array.isArray(d)) return { stages: d };
  if (d && typeof d === 'object' && 'stages' in d) return d as { stages: import('@/lib/types').PipelineStageMetric[] };
  return { stages: [] };
}

export async function getMetricsGeocode(): Promise<import('@/lib/types').GeocodeMetrics> {
  const r = await apiEnvelope<import('@/lib/types').GeocodeMetrics>(endpoints.metricsGeocode());
  return r.data as import('@/lib/types').GeocodeMetrics;
}

export async function getMetricsExtractionMethods(): Promise<unknown[]> {
  const r = await request<ApiEnvelope<unknown[]>>(endpoints.metricsExtractionMethods());
  return Array.isArray(r.data) ? r.data : [];
}

// ---- Governance ----
export async function getGovernanceLineage(): Promise<{ paths: import('@/lib/types').LineagePath[] }> {
  const r = await apiEnvelope<import('@/lib/types').LineagePath[] | { paths: import('@/lib/types').LineagePath[] }>(endpoints.governanceLineage());
  const d = r.data;
  if (Array.isArray(d)) return { paths: d };
  if (d && typeof d === 'object' && 'paths' in d) return d as { paths: import('@/lib/types').LineagePath[] };
  return { paths: [] };
}

export async function getGovernanceAudit(): Promise<{ audit: import('@/lib/types').AuditEntry[] }> {
  const r = await apiEnvelope<import('@/lib/types').AuditEntry[]>(endpoints.governanceAudit());
  return { audit: Array.isArray(r.data) ? r.data : [] };
}

export async function getGovernancePolicies(): Promise<{ policies?: unknown[] }> {
  try {
    const r = await request<ApiEnvelope<unknown[]>>(endpoints.governancePolicies());
    const d = (r as ApiEnvelope<unknown[]>)?.data;
    return { policies: Array.isArray(d) ? d : [] };
  } catch {
    return { policies: [] };
  }
}

// ---- Lineage Explorer ----
export async function getLineageGraph(params?: { mode?: string; run_id?: string; dataset?: string; layer?: string }): Promise<import('@/lib/types').LineageGraphPayload> {
  const url = endpoints.lineageGraph(params);
  const r = await request<ApiEnvelope<import('@/lib/types').LineageGraphPayload>>(url);
  const d = r.data as import('@/lib/types').LineageGraphPayload;
  if (d?.nodes && d?.edges) return d;
  return { nodes: [], edges: [], meta: { generated_at: new Date().toISOString(), mode: params?.mode ?? 'latest', run_id: params?.run_id ?? null } };
}

export async function getCatalogTables(params?: { layer?: string; dataset?: string }): Promise<{ id: string; name: string; layer: string; displayName: string; dataset: string | null; lastUpdated: string | null; rowCount: number | null }[]> {
  const url = endpoints.catalogTables(params);
  const r = await request<ApiEnvelope<{ id: string; name: string; layer: string; displayName: string; dataset: string | null; lastUpdated: string | null; rowCount: number | null }[]>>(url);
  return Array.isArray(r.data) ? r.data : [];
}

// ---- Agent ----
export async function agentChat(message: string, scope = 'latest', runId?: string, disco?: string): Promise<import('@/lib/types').AgentResponse> {
  const r = await request<ApiEnvelope<import('@/lib/types').AgentResponse>>(endpoints.agentQuery(), {
    method: 'POST',
    body: JSON.stringify({ question: message, scope, run_id: runId ?? null, disco: disco ?? null }),
  });
  const d = r.data as Record<string, unknown>;
  return {
    answer: (d?.answer as string) ?? '',
    sources: (d?.referenced_datasets as string[]) ?? (d?.sources as string[]),
    sql_suggestion: (d?.sql_suggestion as string | null) ?? null,
    api_url_suggestions: (d?.api_url_suggestions as string[]) ?? [],
  };
}

// ---- Layers ----
export async function getLayersBronzePdfs(runId?: string, limit = 100, offset = 0): Promise<{ items: unknown[] }> {
  const r = await request<ApiEnvelope<unknown[]>>(endpoints.layersBronzePdfs(runId, limit, offset));
  return { items: Array.isArray(r.data) ? r.data : [] };
}
export async function getLayersBronzeArtifacts(runId?: string, limit = 100, offset = 0): Promise<{ items: unknown[] }> {
  const r = await request<ApiEnvelope<unknown[]>>(endpoints.layersBronzeArtifacts(runId, limit, offset));
  return { items: Array.isArray(r.data) ? r.data : [] };
}
export async function getLayersBronzeTables(params?: { run_id?: string; disco_code?: string; month_name?: string; limit?: number; offset?: number }): Promise<{ items: unknown[] }> {
  const r = await request<ApiEnvelope<unknown[]>>(endpoints.layersBronzeTables(params));
  return { items: Array.isArray(r.data) ? r.data : [] };
}
export async function getLayersSilverCommitments(runId?: string, disco?: string, limit = 100, offset = 0): Promise<{ items: unknown[] }> {
  const r = await request<ApiEnvelope<unknown[]>>(endpoints.layersSilverCommitments(runId, disco, limit, offset));
  return { items: Array.isArray(r.data) ? r.data : [] };
}
export async function getLayersSilverDq(runId?: string, status?: string, limit = 200, offset = 0): Promise<{ items: unknown[] }> {
  const r = await request<ApiEnvelope<unknown[]>>(endpoints.layersSilverDq(runId, status, limit, offset));
  return { items: Array.isArray(r.data) ? r.data : [] };
}
export async function getLayersSilverGeocode(): Promise<{ geocode_coverage_pct?: number; total?: number; geocoded?: number }> {
  try {
    const r = await request<ApiEnvelope<Record<string, unknown>>>(endpoints.layersSilverGeocode());
    const d = (r as ApiEnvelope<Record<string, unknown>>)?.data ?? {};
    return {
      geocode_coverage_pct: d.geocode_coverage_pct as number | undefined,
      total: d.total as number | undefined,
      geocoded: d.geocoded as number | undefined,
    };
  } catch {
    return {};
  }
}
export async function getLayersGoldDims(): Promise<unknown[]> {
  const r = await request<ApiEnvelope<unknown[]>>(endpoints.layersGoldDims());
  return Array.isArray(r.data) ? r.data : [];
}
export async function getLayersGoldFacts(params?: { disco_code?: string; date_key?: number; limit?: number; offset?: number }): Promise<{ items: unknown[] }> {
  const r = await request<ApiEnvelope<unknown[]>>(endpoints.layersGoldFacts(params));
  return { items: Array.isArray(r.data) ? r.data : [] };
}

// ---- Exports (URLs with current filters) ----
export function getExportCommitmentsCsvUrl(params?: { disco?: string; year?: number; month?: string; band?: string }): string {
  return endpoints.exportCommitmentsCsv(params);
}

export function getExportCommitmentsParquetUrl(params?: { disco?: string; year?: number; month?: string; band?: string }): string {
  return endpoints.exportCommitmentsParquet(params);
}

export function getExportMapGeojsonUrl(params?: { disco?: string; year?: number; month?: string; band?: string }): string {
  return endpoints.exportMapGeojson(params);
}
