'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useGlobalFilters } from '@/lib/hooks';
import { useMapPoints } from '@/lib/hooks';
import { getExportMapGeojsonUrl } from '@/lib/api';
import MapView from '@/components/MapView';
import { GEO_CONFIDENCE_THRESHOLD } from '@/lib/constants';
import { formatNumber } from '@/lib/format';
import type { CommitmentRow } from '@/lib/types';
import { demoMapFeatures } from '../demoData';
import { errorText, isPublishedSnapshot } from '../measure';
import { selectionFromCommitment, selectionFromFeature, type FeederSelection } from '../selection';
import { useCommitmentPage, useDemo, useFreshness, usePreviewHref } from '../useConsoleData';
import FeederDetailPanel from '../FeederDetailPanel';
import { CountLabel, LoadingRows, PageHeader, StateBlock, StatusPill } from '../ui';

type ListMode = 'all' | 'mapped' | 'unmapped';

export default function FeederMap() {
  const demo = useDemo();
  const href = usePreviewHref();
  const { filters } = useGlobalFilters();
  const freshness = useFreshness(demo);
  const published = isPublishedSnapshot(freshness.data);
  const [highConfidence, setHighConfidence] = useState(false);
  const [listMode, setListMode] = useState<ListMode>('all');
  const [selected, setSelected] = useState<FeederSelection | null>(null);

  const apiParams = useMemo(
    () => ({
      disco_code: filters.disco || undefined,
      year: filters.year ?? undefined,
      month: filters.month || undefined,
      band: filters.band || undefined,
    }),
    [filters]
  );
  const liveMap = useMapPoints(apiParams);
  const commitments = useCommitmentPage(demo, { ...apiParams, q: filters.search || undefined, limit: 500, offset: 0 });
  const features = demo ? demoMapFeatures().filter((feature) => {
    if (apiParams.disco_code && feature.properties.disco_code !== apiParams.disco_code) return false;
    if (apiParams.year != null && feature.properties.year !== apiParams.year) return false;
    if (apiParams.month && feature.properties.month_name !== apiParams.month) return false;
    if (apiParams.band && feature.properties.band !== apiParams.band) return false;
    return true;
  }) : liveMap.data?.features ?? [];

  const rows = commitments.data?.commitments ?? [];
  const visible = rows.filter((row) => {
    const mapped = row.lat != null && row.lon != null;
    if (listMode === 'mapped') return mapped;
    if (listMode === 'unmapped') return !mapped;
    return true;
  });
  const unmapped = rows.filter((row) => row.lat == null || row.lon == null).length;

  const exportParams = {
    disco: filters.disco || undefined,
    year: filters.year ?? undefined,
    month: filters.month || undefined,
    band: filters.band || undefined,
  };

  const selectRow = (row: CommitmentRow) => {
    const next = selectionFromCommitment(row);
    setSelected(next);
    const node = document.querySelector(`[data-row-id="${CSS.escape(next.id)}"]`);
    node?.scrollIntoView({ block: 'nearest' });
  };

  return (
    <div>
      <PageHeader
        title="Feeder Map"
        period={freshness.isLoading ? 'Loading…' : published ? freshness.data?.month_range || 'Not provided' : 'Not published'}
        description="The map and the list share one selection. Records without coordinates stay in the list."
        productionHref="/map"
        actions={
          <a className="pc-btn" href={getExportMapGeojsonUrl(exportParams)}>
            Download GeoJSON
          </a>
        }
      />
      <p className="pc-gap">
        GeoJSON covers the latest map points for {exportParams.disco ? `DisCo ${exportParams.disco}` : 'all DisCos'}
        {exportParams.year ? `, ${exportParams.year}` : ''}
        {exportParams.month ? `, ${exportParams.month}` : ''}
        {exportParams.band ? `, band ${exportParams.band}` : ''}. Feeder search is not an export parameter. Unmapped records are omitted from this file because the endpoint returns coordinates only.
      </p>
      <div className="pc-legend" aria-label="Map legend">
        <span><i className="pc-swatch" style={{ background: '#0F4C75' }} /> Mapped feeder</span>
        <span><i className="pc-swatch" style={{ background: '#C4A35A' }} /> Cluster</span>
        <span><i className="pc-swatch" style={{ background: '#8A5A12' }} /> Unmapped — list only</span>
      </div>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, fontSize: 13 }}>
        <input type="checkbox" checked={highConfidence} onChange={(event) => setHighConfidence(event.target.checked)} />
        Map: high confidence only (≥ {Math.round(GEO_CONFIDENCE_THRESHOLD * 100)}%). Records without a score stay in the list and are hidden on the map.
      </label>
      <p className="pc-gap">
        Selecting a list row opens the same detail panel as a map click. The current map component does not restyle a marker chosen from the list.
        {filters.disco || filters.month || filters.band || filters.search ? (
          <> Filters follow the explorer query string. <Link href={href('/commitments', { disco: filters.disco, year: filters.year, month: filters.month, band: filters.band, q: filters.search })}>Edit them in the explorer.</Link></>
        ) : null}
      </p>

      {!published && !freshness.isLoading && !demo && (
        <StateBlock tone="awaiting" title="No published feeder locations">
          The map stays empty until a snapshot with coordinates is promoted. Unmapped records will still be listed when the snapshot contains them.
        </StateBlock>
      )}
      {(commitments.isError || (!demo && liveMap.isError)) && (
        <StateBlock tone="error" title="Map data could not be loaded">
          {errorText(commitments.error ?? liveMap.error)}
        </StateBlock>
      )}
      {(commitments.isLoading || (!demo && liveMap.isLoading)) && <LoadingRows />}

      {(published || demo) && !commitments.isLoading && (
        <div className="pc-map-layout">
          <div>
            <div className="pc-map-frame">
              <MapView
                geojson={{ type: 'FeatureCollection', features }}
                showHighConfidenceOnly={highConfidence}
                onPointClick={(feature) => setSelected(selectionFromFeature(feature))}
              />
            </div>
            <p className="pc-count">
              Map points <strong className="pc-num">{formatNumber(features.length)}</strong>
              {' · '}
              Unmapped in the loaded list <strong className="pc-num">{formatNumber(unmapped)}</strong>
            </p>
          </div>
          <div>
            <div className="pc-toolbar">
              <CountLabel shown={visible.length} total={commitments.data?.meta?.count ?? null} />
              <div role="group" aria-label="List filter" style={{ display: 'flex', gap: 6 }}>
                {(['all', 'mapped', 'unmapped'] as ListMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className="pc-btn"
                    aria-pressed={listMode === mode}
                    onClick={() => setListMode(mode)}
                  >
                    {mode === 'all' ? 'All' : mode === 'mapped' ? 'Mapped' : 'Unmapped'}
                  </button>
                ))}
              </div>
            </div>
            <div className="pc-map-list" aria-label="Feeder list">
              {visible.length === 0 && <StateBlock tone="empty" title="No feeders in this list" />}
              {visible.map((row) => {
                const item = selectionFromCommitment(row);
                const mapped = row.lat != null && row.lon != null;
                return (
                  <button
                    key={item.id}
                    type="button"
                    data-row-id={item.id}
                    aria-current={selected?.id === item.id ? 'true' : undefined}
                    onClick={() => selectRow(row)}
                  >
                    <strong>{row.feeder_name}</strong>
                    <small>
                      {row.disco_code} · {row.month_name} {row.year} · {row.band || 'band not set'} ·{' '}
                      {row.min_supply_hours == null ? 'commitment not published' : `${formatNumber(row.min_supply_hours)} published hours`}
                    </small>
                    <StatusPill tone={mapped ? 'info' : 'warn'}>{mapped ? 'Mapped' : 'Unmapped'}</StatusPill>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      <div className="pc-work" style={{ marginTop: 12 }}>
        <FeederDetailPanel selection={selected} onClose={() => setSelected(null)} />
      </div>
    </div>
  );
}
