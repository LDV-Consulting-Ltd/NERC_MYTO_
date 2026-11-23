import type { CommitmentRow, MapPointFeature } from '@/lib/types';

/** Fields the detail panel is allowed to show. Published hours are not measured performance. */
export type FeederSelection = {
  id: string;
  feederKey: number | null;
  feederName: string;
  discoCode: string;
  band: string | null;
  minSupplyHours: number | null;
  periodLabel: string;
  location: string | null;
  sourcePdfUrl: string | null;
  sourcePageNo: number | null;
  geocodeConfidence: number | null;
  geocodeProvider: string | null;
  mapped: boolean;
};

export function selectionId(parts: {
  feederKey?: number | null;
  discoCode?: string | null;
  feederName?: string | null;
  periodLabel?: string | null;
}): string {
  if (parts.feederKey != null && parts.feederKey > 0) return `key:${parts.feederKey}`;
  return `row:${parts.discoCode ?? ''}|${parts.feederName ?? ''}|${parts.periodLabel ?? ''}`;
}

export function selectionFromCommitment(row: CommitmentRow): FeederSelection {
  const periodLabel = `${row.month_name} ${row.year}`;
  return {
    id: selectionId({
      feederKey: row.feeder_key,
      discoCode: row.disco_code,
      feederName: row.feeder_name,
      periodLabel,
    }),
    feederKey: row.feeder_key ?? null,
    feederName: row.feeder_name,
    discoCode: row.disco_code,
    band: row.band ?? null,
    minSupplyHours: row.min_supply_hours ?? null,
    periodLabel,
    location: row.feeder_location ?? null,
    sourcePdfUrl: row.source_pdf_url ?? null,
    sourcePageNo: row.source_page_no ?? null,
    geocodeConfidence: row.geocode_confidence ?? null,
    geocodeProvider: row.geocode_provider ?? null,
    mapped: row.lat != null && row.lon != null,
  };
}

export function selectionFromFeature(feature: MapPointFeature): FeederSelection {
  const props = feature.properties ?? {};
  const periodLabel = [props.month_name, props.year].filter((v) => v != null && v !== '').join(' ');
  const coords = feature.geometry?.coordinates;
  return {
    id: selectionId({
      feederKey: props.feeder_key,
      discoCode: props.disco_code,
      feederName: props.feeder_name,
      periodLabel,
    }),
    feederKey: props.feeder_key ?? null,
    feederName: props.feeder_name || 'Unnamed feeder',
    discoCode: props.disco_code || '—',
    band: props.band ?? null,
    minSupplyHours: props.min_supply_hours ?? null,
    periodLabel: periodLabel || 'Not published',
    location: props.feeder_location ?? null,
    sourcePdfUrl: props.source_pdf_url ?? null,
    sourcePageNo: props.source_page_no ?? null,
    geocodeConfidence: props.geocode_confidence ?? null,
    geocodeProvider: props.geocode_provider ?? null,
    mapped: Array.isArray(coords) && coords.length >= 2,
  };
}
