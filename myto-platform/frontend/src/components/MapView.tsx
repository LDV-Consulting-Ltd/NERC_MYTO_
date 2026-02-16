'use client';

import { useEffect, useRef, useState } from 'react';
import type { MapPointFeature } from '@/lib/types';
import { normalizeMapPoints, getBounds, type FeatureCollection } from '@/lib/geo';

interface MapViewProps {
  geojson: FeatureCollection | { type: string; features: MapPointFeature[] } | null;
  onPointClick?: (feature: MapPointFeature) => void;
  showHighConfidenceOnly?: boolean;
}

const GEO_CONFIDENCE_THRESHOLD = 0.7;

export default function MapView({
  geojson,
  onPointClick,
  showHighConfidenceOnly = false,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !geojson?.features?.length) return;

    let cancelled = false;
    let map: unknown = null;

    import('maplibre-gl').then((maplibre) => {
      if (cancelled || !containerRef.current) return;
      const fc = normalizeMapPoints(geojson);
      let features = fc.features;
      if (showHighConfidenceOnly) {
        features = features.filter(
          (f) => (f.properties?.geocode_confidence ?? 0) >= GEO_CONFIDENCE_THRESHOLD
        );
      }
      if (!features.length) {
        setReady(true);
        return;
      }
      const bounds = getBounds(features);
      const MapLibre = maplibre.default;
      map = new MapLibre.Map({
        container: containerRef.current,
        style: 'https://demotiles.maplibre.org/style.json',
      });
      (map as { on: (e: string, fn: () => void) => void }).on('load', () => {
        if (cancelled || !mapRef.current) return;
        const m = mapRef.current as {
          addSource: (id: string, opts: unknown) => void;
          addLayer: (layer: unknown) => void;
          fitBounds: (b: number[][], o?: { padding?: number }) => void;
        };
        m.addSource('myto-points', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features },
          cluster: true,
          clusterMaxZoom: 12,
          clusterRadius: 50,
        });
        m.addLayer({
          id: 'myto-clusters',
          type: 'circle',
          source: 'myto-points',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': '#C9A24A',
            'circle-radius': 20,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#0B2A3C',
          },
        });
        m.addLayer({
          id: 'myto-cluster-count',
          type: 'symbol',
          source: 'myto-points',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': ['get', 'point_count_abbreviated'],
            'text-size': 12,
          },
          paint: { 'text-color': '#0B2A3C' },
        });
        m.addLayer({
          id: 'myto-unclustered',
          type: 'circle',
          source: 'myto-points',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': '#0F4C75',
            'circle-radius': 8,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#0B2A3C',
          },
        });
        if (bounds) {
          m.fitBounds(bounds as unknown as number[][], { padding: 40 });
        }
        setReady(true);
      });
      mapRef.current = map;
      (map as { on: (e: string, fn: (ev: { features?: MapPointFeature[] }) => void) => void }).on(
        'click',
        'myto-unclustered',
        (ev: { features?: MapPointFeature[] }) => {
          const f = ev.features?.[0];
          if (f && onPointClick) onPointClick(f);
        }
      );
      (map as { on: (e: string, fn: (ev: { features?: MapPointFeature[] }) => void) => void }).on(
        'click',
        'myto-clusters',
        (ev: { features?: MapPointFeature[] }) => {
          const f = ev.features?.[0];
          if (f && onPointClick) onPointClick(f);
        }
      );
    });

    return () => {
      cancelled = true;
      if (mapRef.current && typeof (mapRef.current as { remove: () => void }).remove === 'function') {
        (mapRef.current as { remove: () => void }).remove();
      }
      mapRef.current = null;
    };
  }, [geojson, showHighConfidenceOnly, onPointClick]);

  const fc = geojson ? normalizeMapPoints(geojson) : null;
  const features = fc?.features ?? [];
  const filtered =
    showHighConfidenceOnly && features.length
      ? features.filter(
          (f) => (f.properties?.geocode_confidence ?? 0) >= GEO_CONFIDENCE_THRESHOLD
        )
      : features;

  if (!fc || !filtered.length) {
    return (
      <div className="min-h-[400px] flex items-center justify-center bg-surface rounded-lg border border-[var(--ldv-border)] text-[var(--ldv-text-muted)]">
        No map points. Apply filters or run pipeline.
      </div>
    );
  }

  return (
    <div className="relative rounded-lg overflow-hidden border border-[var(--ldv-border)]">
      <div ref={containerRef} className="w-full h-[500px]" />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface/80 text-[var(--ldv-text-muted)]">
          Loading map…
        </div>
      )}
    </div>
  );
}
