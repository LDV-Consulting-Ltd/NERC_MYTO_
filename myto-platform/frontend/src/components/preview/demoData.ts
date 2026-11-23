import type { CommitmentRow, CoverageMeta, FreshnessMeta, MapPointFeature } from '@/lib/types';

/** Isolated sample rows for layout review. Not a NERC publication. */
export const DEMO_LABEL = 'Demo data — sample records for layout review, not a published NERC snapshot.';

export const DEMO_FRESHNESS: FreshnessMeta = {
  latest_run_id: 'demo-layout-only',
  refreshed_at: '2026-02-15T09:30:00.000Z',
  disco_count: 4,
  month_range: 'November 2025 – January 2026',
  total_rows: 5,
};

export const DEMO_COVERAGE: CoverageMeta = {
  geocode_coverage_pct: 60,
  extraction_coverage_pct: 80,
  total_records: 5,
};

export const DEMO_DISCOS = ['AEDC', 'IE', 'KEDCO', 'PHED'];

export const DEMO_MONTHS = [
  { year: 2025, month_name: 'November' },
  { year: 2025, month_name: 'December' },
  { year: 2026, month_name: 'January' },
];

const PDF_A = 'https://example.invalid/nerc/myto-aedc-november-2025.pdf';
const PDF_B = 'https://example.invalid/nerc/myto-ie-january-2026.pdf';

export const DEMO_COMMITMENTS: CommitmentRow[] = [
  {
    run_id: 'demo-layout-only',
    refreshed_at: DEMO_FRESHNESS.refreshed_at ?? null,
    disco_code: 'AEDC',
    month_name: 'November',
    year: 2025,
    band: 'A',
    feeder_name: 'Wuse 11kV',
    feeder_location: 'Wuse, Abuja',
    lat: 9.0765,
    lon: 7.3986,
    min_supply_hours: 20,
    source_pdf_url: PDF_A,
    source_page_no: 12,
    geocode_confidence: 0.91,
    geocode_provider: 'demo-cache',
    feeder_key: 101,
  },
  {
    run_id: 'demo-layout-only',
    refreshed_at: DEMO_FRESHNESS.refreshed_at ?? null,
    disco_code: 'AEDC',
    month_name: 'December',
    year: 2025,
    band: 'B',
    feeder_name: 'Garki 11kV',
    feeder_location: 'Garki, Abuja',
    lat: 9.036,
    lon: 7.49,
    min_supply_hours: null,
    source_pdf_url: PDF_A,
    source_page_no: 14,
    geocode_confidence: 0.62,
    geocode_provider: 'demo-online',
    feeder_key: 102,
  },
  {
    run_id: 'demo-layout-only',
    refreshed_at: DEMO_FRESHNESS.refreshed_at ?? null,
    disco_code: 'IE',
    month_name: 'January',
    year: 2026,
    band: 'A',
    feeder_name: 'Ikeja 33kV',
    feeder_location: 'Ikeja, Lagos',
    lat: 6.6018,
    lon: 3.3515,
    min_supply_hours: 16,
    source_pdf_url: PDF_B,
    source_page_no: 4,
    geocode_confidence: 0.84,
    geocode_provider: 'demo-cache',
    feeder_key: 103,
  },
  {
    run_id: 'demo-layout-only',
    refreshed_at: DEMO_FRESHNESS.refreshed_at ?? null,
    disco_code: 'KEDCO',
    month_name: 'November',
    year: 2025,
    band: 'C',
    feeder_name: 'Nassarawa 11kV',
    feeder_location: 'Kano',
    lat: null,
    lon: null,
    min_supply_hours: 12,
    source_pdf_url: undefined,
    geocode_confidence: undefined,
    feeder_key: 104,
  },
  {
    run_id: 'demo-layout-only',
    refreshed_at: DEMO_FRESHNESS.refreshed_at ?? null,
    disco_code: 'PHED',
    month_name: 'January',
    year: 2026,
    band: 'B',
    feeder_name: 'Trans Amadi 33kV',
    feeder_location: 'Port Harcourt',
    lat: 4.8156,
    lon: 7.0498,
    min_supply_hours: 18,
    source_pdf_url: PDF_B,
    source_page_no: 9,
    geocode_confidence: 0.44,
    geocode_provider: 'demo-online',
    feeder_key: 105,
  },
];

export function demoMapFeatures(): MapPointFeature[] {
  return DEMO_COMMITMENTS.filter((row) => row.lat != null && row.lon != null).map((row) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [row.lon as number, row.lat as number] },
    properties: {
      disco_code: row.disco_code,
      month_name: row.month_name,
      year: row.year,
      feeder_name: row.feeder_name,
      feeder_location: row.feeder_location,
      band: row.band,
      min_supply_hours: row.min_supply_hours ?? undefined,
      feeder_key: row.feeder_key,
      geocode_confidence: row.geocode_confidence,
      geocode_provider: row.geocode_provider,
      source_pdf_url: row.source_pdf_url,
      source_page_no: row.source_page_no,
    },
  }));
}

export function filterDemoCommitments(params: {
  disco_code?: string;
  year?: number;
  month?: string;
  band?: string;
  q?: string;
}): CommitmentRow[] {
  const q = params.q?.trim().toLowerCase();
  return DEMO_COMMITMENTS.filter((row) => {
    if (params.disco_code && row.disco_code !== params.disco_code) return false;
    if (params.year != null && row.year !== params.year) return false;
    if (params.month && row.month_name.toLowerCase() !== params.month.toLowerCase()) return false;
    if (params.band && (row.band ?? '').toLowerCase() !== params.band.toLowerCase()) return false;
    if (q) {
      const hay = `${row.feeder_name} ${row.feeder_location} ${row.disco_code}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
