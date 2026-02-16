import type { MapPointFeature } from './types';

export interface FeatureCollection {
  type: 'FeatureCollection';
  features: MapPointFeature[];
}

export function isGeoJSONFeatureCollection(value: unknown): value is FeatureCollection {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as FeatureCollection).type === 'FeatureCollection' &&
    Array.isArray((value as FeatureCollection).features)
  );
}

export function normalizeMapPoints(data: unknown): FeatureCollection {
  if (isGeoJSONFeatureCollection(data)) return data;
  if (typeof data === 'object' && data !== null && 'features' in (data as { features?: unknown })) {
    const fc = data as { type?: string; features: unknown[] };
    fc.type = 'FeatureCollection';
    return fc as FeatureCollection;
  }
  return { type: 'FeatureCollection', features: [] };
}

export function getBounds(features: MapPointFeature[]): [[number, number], [number, number]] | null {
  if (!features.length) return null;
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  for (const f of features) {
    const coords = f.geometry?.coordinates;
    if (Array.isArray(coords) && coords.length >= 2) {
      const [lon, lat] = coords;
      minLon = Math.min(minLon, lon);
      minLat = Math.min(minLat, lat);
      maxLon = Math.max(maxLon, lon);
      maxLat = Math.max(maxLat, lat);
    }
  }
  if (minLon === Infinity) return null;
  return [[minLon, minLat], [maxLon, maxLat]];
}
