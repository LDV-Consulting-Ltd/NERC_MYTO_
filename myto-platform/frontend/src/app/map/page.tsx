'use client';

import { useState, useMemo, Suspense } from 'react';
import { useGlobalFilters } from '@/lib/hooks';
import { useMapPoints } from '@/lib/hooks';
import MapView from '@/components/MapView';
import DrillThroughPanel from '@/components/DrillThroughPanel';
import EvidenceLink from '@/components/EvidenceLink';
import { getExportMapGeojsonUrl } from '@/lib/api';
import type { MapPointFeature } from '@/lib/types';
import { GEO_CONFIDENCE_THRESHOLD } from '@/lib/constants';

function MapPageContent() {
  const { filters, toApiParams } = useGlobalFilters();
  const apiParams = useMemo(
    () => ({
      disco_code: filters.disco || undefined,
      year: filters.year ?? undefined,
      month: filters.month || undefined,
      band: filters.band || undefined,
    }),
    [filters]
  );
  const { data, isLoading, error } = useMapPoints(apiParams);
  const [showHighConfidenceOnly, setShowHighConfidenceOnly] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<MapPointFeature | null>(null);

  const geojson = useMemo(() => {
    if (!data?.features) return null;
    return { type: 'FeatureCollection' as const, features: data.features };
  }, [data]);

  const feederKey = selectedFeature?.properties?.feeder_key;
  const fallbackRow = selectedFeature
    ? {
        feeder_name: selectedFeature.properties?.feeder_name,
        feeder_location: selectedFeature.properties?.feeder_location,
        min_supply_hours: selectedFeature.properties?.min_supply_hours,
        geocode_confidence: selectedFeature.properties?.geocode_confidence,
        source_pdf_url: selectedFeature.properties?.source_pdf_url,
        source_page_no: selectedFeature.properties?.source_page_no,
      }
    : undefined;

  const exportUrl = getExportMapGeojsonUrl({
    disco: filters.disco || undefined,
    year: filters.year ?? undefined,
    month: filters.month || undefined,
    band: filters.band || undefined,
  });

  return (
    <div className="flex gap-4">
      <div className="flex-1 min-w-0">
        <h1 className="text-2xl font-semibold text-[var(--ldv-primary)] tracking-tight mb-2">National Map</h1>
        <p className="text-sm text-[var(--ldv-text-muted)] mb-4">
          Territory supply commitments with drill-through to feeder level. Confidence and evidence links in the side panel.
        </p>
        <div className="flex items-center gap-4 mb-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showHighConfidenceOnly}
              onChange={(e) => setShowHighConfidenceOnly(e.target.checked)}
            />
            High confidence only (≥{GEO_CONFIDENCE_THRESHOLD * 100}%)
          </label>
          <a href={exportUrl} download className="btn-secondary">
            Export GeoJSON
          </a>
        </div>
        {error && (
          <p className="text-red-600 mb-2">
            Failed to load map points. If you just ran the pipeline, wait for Silver and geocode stages to finish, then refresh.
          </p>
        )}
        {isLoading && <p className="text-[var(--ldv-text-muted)]">Loading…</p>}
        {!isLoading && geojson && (
          <MapView
            geojson={geojson}
            showHighConfidenceOnly={showHighConfidenceOnly}
            onPointClick={setSelectedFeature}
          />
        )}
        {!isLoading && !geojson && !error && (
          <div className="min-h-[400px] flex items-center justify-center bg-surface rounded-lg border border-[var(--ldv-border)] text-[var(--ldv-text-muted)]">
            No map data. Run the pipeline to load commitments and geocode locations.
          </div>
        )}
      </div>
      {(selectedFeature != null || feederKey != null) && (
        <div className="w-80 shrink-0 flex flex-col">
          {selectedFeature && (
            <div className="bg-white border border-[var(--ldv-border)] rounded-lg p-3 mb-2">
              <h3 className="font-semibold text-primary mb-2">Point</h3>
              <p><span className="text-[var(--ldv-text-muted)]">Disco:</span> {selectedFeature.properties?.disco_code}</p>
              <p><span className="text-[var(--ldv-text-muted)]">Feeder:</span> {selectedFeature.properties?.feeder_name ?? '—'}</p>
              <p><span className="text-[var(--ldv-text-muted)]">Min hours:</span> {selectedFeature.properties?.min_supply_hours ?? '—'}</p>
              <p><span className="text-[var(--ldv-text-muted)]">Evidence:</span> <EvidenceLink pdfUrl={selectedFeature.properties?.source_pdf_url} pageNo={selectedFeature.properties?.source_page_no} /></p>
            </div>
          )}
          <DrillThroughPanel
            feederKey={typeof feederKey === 'number' ? feederKey : null}
            onClose={() => setSelectedFeature(null)}
            fallbackRow={fallbackRow}
          />
        </div>
      )}
    </div>
  );
}

export default function MapPage() {
  return (
    <Suspense fallback={<div className="text-[var(--ldv-text-muted)] p-4">Loading map…</div>}>
      <MapPageContent />
    </Suspense>
  );
}
