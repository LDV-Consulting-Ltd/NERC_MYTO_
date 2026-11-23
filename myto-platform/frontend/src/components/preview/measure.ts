import type { CommitmentRow, CoverageMeta, FreshnessMeta } from '@/lib/types';
import { formatNumber, formatPct } from '@/lib/format';

/** A published snapshot exists only when freshness names a run, a time, or a positive row count. */
export function isPublishedSnapshot(freshness: FreshnessMeta | null | undefined): boolean {
  if (!freshness) return false;
  if (freshness.latest_run_id) return true;
  if (freshness.refreshed_at) return true;
  return freshness.total_rows != null && freshness.total_rows > 0;
}

export function reportingPeriod(freshness: FreshnessMeta | null | undefined): string {
  const range = freshness?.month_range?.trim();
  if (!range || range === '—') return 'Not published';
  return range;
}

/** Count or percent. Missing values stay blank. Zero is shown only when the source explicitly measured zero against a known population. */
export function measureCount(value: number | null | undefined, populationKnown: boolean): string {
  if (!populationKnown) return 'Not published';
  if (value == null || Number.isNaN(value)) return '—';
  return formatNumber(value);
}

export function measurePct(
  value: number | null | undefined,
  population: number | null | undefined
): string {
  if (population == null || population <= 0) return 'Not published';
  if (value == null || Number.isNaN(value)) return '—';
  return formatPct(value, 1);
}

export function isPartialPct(value: number | null | undefined, population: number | null | undefined): boolean {
  if (population == null || population <= 0) return false;
  if (value == null || Number.isNaN(value)) return false;
  return value > 0 && value < 100;
}

export type DiscoRollup = {
  code: string;
  records: number | null;
  periods: number | null;
  mapped: number | null;
  evidenced: number | null;
  inPage: boolean;
};

export function rollupDiscos(
  rows: CommitmentRow[],
  discoList: string[],
  loadedAll: boolean
): DiscoRollup[] {
  const buckets = new Map<
    string,
    { records: number; periods: Set<string>; mapped: number; evidenced: number }
  >();

  const ensure = (code: string) => {
    const existing = buckets.get(code);
    if (existing) return existing;
    const created = { records: 0, periods: new Set<string>(), mapped: 0, evidenced: 0 };
    buckets.set(code, created);
    return created;
  };

  for (const code of discoList) ensure(code);
  for (const row of rows) {
    const code = row.disco_code || 'Unknown';
    const bucket = ensure(code);
    bucket.records += 1;
    if (row.month_name || row.year) bucket.periods.add(`${row.month_name} ${row.year}`);
    if (row.lat != null && row.lon != null) bucket.mapped += 1;
    if (row.source_pdf_url) bucket.evidenced += 1;
  }

  return [...buckets.entries()]
    .map(([code, bucket]) => {
      const inPage = bucket.records > 0;
      if (!inPage && !loadedAll) {
        return {
          code,
          records: null,
          periods: null,
          mapped: null,
          evidenced: null,
          inPage: false,
        };
      }
      return {
        code,
        records: bucket.records,
        periods: bucket.periods.size,
        mapped: bucket.mapped,
        evidenced: bucket.evidenced,
        inPage,
      };
    })
    .sort((a, b) => a.code.localeCompare(b.code));
}

export function shareLabel(part: number | null, whole: number | null): string {
  if (part == null || whole == null) return 'Not in loaded page';
  if (whole === 0) return '—';
  return `${formatNumber(part)} of ${formatNumber(whole)}`;
}

export function coverageTone(coverage: CoverageMeta | null | undefined): 'partial' | 'complete' | 'unknown' {
  const population = coverage?.total_records;
  if (population == null || population <= 0) return 'unknown';
  const geo = coverage?.geocode_coverage_pct;
  const extraction = coverage?.extraction_coverage_pct;
  const partial =
    (geo != null && geo < 100) || (extraction != null && extraction < 100);
  return partial ? 'partial' : 'complete';
}

export function errorText(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'The request failed.';
}

export function displayValue(value: unknown): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return '—';
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string') return value.length > 120 ? `${value.slice(0, 117)}…` : value;
  try {
    const text = JSON.stringify(value);
    return text.length > 120 ? `${text.slice(0, 117)}…` : text;
  } catch {
    return '—';
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

export function recordColumns(rows: Record<string, unknown>[], max = 7): string[] {
  const keys: string[] = [];
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!keys.includes(key)) keys.push(key);
      if (keys.length >= max) return keys;
    }
  }
  return keys;
}
