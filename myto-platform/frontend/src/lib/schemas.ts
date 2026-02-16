import { z } from 'zod';

export const runSummarySchema = z.object({
  run_id: z.string(),
  started_at: z.string(),
  finished_at: z.string().nullable(),
  status: z.string(),
  source_root_url: z.string().nullable(),
  notes: z.string().nullable(),
});

export const stageInfoSchema = z.object({
  stage_name: z.string(),
  started_at: z.string().nullable(),
  finished_at: z.string().nullable(),
  status: z.string(),
  input_count: z.number().nullable(),
  output_count: z.number().nullable(),
  error_count: z.number().nullable(),
  duration_ms: z.number().nullable(),
  meta: z.unknown().optional(),
});

export const runDetailSchema = z.object({
  run_id: z.string(),
  started_at: z.string(),
  finished_at: z.string().nullable(),
  status: z.string(),
  source_root_url: z.string().nullable(),
  notes: z.string().nullable(),
  stages: z.array(stageInfoSchema),
});

export const runEventSchema = z.object({
  stage_name: z.string(),
  event_ts: z.string().nullable(),
  level: z.string(),
  message: z.string().nullable(),
  context: z.unknown().optional(),
});

export const commitmentRowSchema = z.object({
  run_id: z.string(),
  refreshed_at: z.string().nullable(),
  disco_code: z.string(),
  month_name: z.string(),
  year: z.number(),
  band: z.string().optional(),
  feeder_name: z.string(),
  feeder_location: z.string(),
  lat: z.number().nullable(),
  lon: z.number().nullable(),
  min_supply_hours: z.number().nullable(),
  source_pdf_url: z.string().optional(),
  source_page_no: z.number().optional(),
  geocode_confidence: z.number().optional(),
  geocode_provider: z.string().optional(),
  feeder_key: z.number().optional(),
});

export const mapPointFeatureSchema = z.object({
  type: z.literal('Feature'),
  geometry: z.object({ type: z.literal('Point'), coordinates: z.tuple([z.number(), z.number()]) }),
  properties: z.record(z.unknown()),
});

export const geojsonFeatureCollectionSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(mapPointFeatureSchema),
});

export const dqSummarySchema = z.object({
  dq_score: z.number(),
  total_records: z.number(),
  by_status: z.record(z.number()),
});

export const dqIssueSchema = z.object({
  record_id: z.string(),
  dq_status: z.string(),
  dq_reasons: z.unknown(),
  created_at: z.string().nullable(),
  run_id: z.string().optional(),
});

export const feederDetailSchema = z.object({
  feeder_key: z.number(),
  rows: z.array(z.object({
    run_id: z.string(),
    refreshed_at: z.string().nullable(),
    date_key: z.number(),
    disco_code: z.string(),
    feeder_name: z.string(),
    band: z.string().nullable(),
    min_supply_hours: z.number().nullable(),
  })),
});

export const agentResponseSchema = z.object({
  answer: z.string(),
  sources: z.array(z.string()).optional(),
  sql_suggestion: z.string().nullable().optional(),
  api_url_suggestions: z.array(z.string()).optional(),
});

export const envelopeSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({ data: dataSchema, meta: z.record(z.unknown()).optional() });
