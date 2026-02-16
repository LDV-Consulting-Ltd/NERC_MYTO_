// Run & pipeline
export interface RunSummary {
  run_id: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  source_root_url: string | null;
  notes: string | null;
  heartbeat_at?: string | null;
}

export interface StageInfo {
  stage_name: string;
  started_at: string | null;
  finished_at: string | null;
  status: string;
  input_count: number | null;
  output_count: number | null;
  error_count: number | null;
  duration_ms: number | null;
  meta: unknown;
}

export interface RunDetail {
  run_id: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  source_root_url: string | null;
  notes: string | null;
  heartbeat_at?: string | null;
  stages: StageInfo[];
}

export interface RunEvent {
  stage_name: string;
  event_ts: string | null;
  level: string;
  message: string | null;
  context: unknown;
}

// Latest snapshot & commitments
export interface LatestSnapshotMeta {
  run_id: string | null;
  refreshed_at: string | null;
  disco_count: number;
  month_range: string;
  total_rows: number;
}

export interface CommitmentRow {
  run_id: string;
  refreshed_at: string | null;
  disco_code: string;
  month_name: string;
  year: number;
  band?: string;
  feeder_name: string;
  feeder_location: string;
  lat: number | null;
  lon: number | null;
  min_supply_hours: number | null;
  source_pdf_url?: string;
  source_page_no?: number;
  geocode_confidence?: number;
  geocode_provider?: string;
  feeder_key?: number;
}

export interface MapPointFeature {
  type: string;
  geometry: { type: string; coordinates: number[] };
  properties: {
    disco_code?: string;
    month_name?: string;
    year?: number;
    feeder_name?: string;
    feeder_location?: string;
    band?: string;
    min_supply_hours?: number;
    feeder_key?: number;
    geocode_confidence?: number;
    geocode_provider?: string;
    source_pdf_url?: string;
    source_page_no?: number;
  };
}

export interface FeederDetail {
  feeder_key: number;
  rows: {
    run_id: string;
    refreshed_at: string | null;
    date_key: number;
    disco_code: string;
    feeder_name: string;
    band: string | null;
    min_supply_hours: number | null;
  }[];
}

// DQ
export interface DqSummary {
  dq_score: number;
  total_records: number;
  by_status: Record<string, number>;
}

export interface DqIssue {
  record_id: string;
  dq_status: string;
  dq_reasons: unknown;
  created_at: string | null;
  run_id?: string;
}

// Metrics
export interface PipelineStageMetric {
  run_id: string;
  stage_name: string;
  duration_ms: number | null;
  output_count: number | null;
  error_count: number | null;
  status: string;
}

export interface GeocodeMetrics {
  cache_entries: number;
  geocoded_latest_count: number;
  total_latest: number;
  geocode_coverage_pct: number;
}

// Metadata & governance
export interface DatasetMeta {
  name: string;
  layer: string;
  description: string;
}

export interface LineagePath {
  metric: string;
  gold: string;
  silver: string;
  bronze: string;
  source: string;
}

// Lineage Explorer (graph from transform registry)
export type LineageLayer = 'source' | 'bronze' | 'silver' | 'gold';

export interface LineageNodePayload {
  id: string;
  layer: LineageLayer;
  displayName: string;
  dataset: string | null;
  lastUpdated: string | null;
  rowCount: number | null;
}

export interface LineageEdgePayload {
  id: string;
  source: string;
  target: string;
  transformName: string;
  runId: string | null;
  ts: string | null;
}

export interface LineageGraphPayload {
  nodes: LineageNodePayload[];
  edges: LineageEdgePayload[];
  meta: { generated_at: string; mode: string; run_id: string | null };
}

export interface AuditEntry {
  run_id: string;
  refreshed_at: string | null;
  event?: string;
}

// Agent
export interface AgentResponse {
  answer: string;
  sources?: string[];
  sql_suggestion?: string | null;
  api_url_suggestions?: string[];
}

// UI / API envelope
export interface ApiEnvelope<T> {
  data: T;
  meta?: {
    snapshot_run_id?: string;
    refreshed_at?: string;
    count?: number;
    next_cursor?: string;
    limit?: number;
    offset?: number;
  };
}

export interface MonthOption {
  year: number;
  month_name: string;
}

// Freshness / coverage (from metadata)
export interface FreshnessMeta {
  latest_run_id?: string | null;
  refreshed_at?: string | null;
  disco_count?: number;
  month_range?: string;
  total_rows?: number;
}

export interface CoverageMeta {
  geocode_coverage_pct?: number;
  extraction_coverage_pct?: number;
  total_records?: number;
}
