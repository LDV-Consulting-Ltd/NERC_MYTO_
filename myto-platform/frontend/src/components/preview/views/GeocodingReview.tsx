'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getLayersSilverGeocode } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { useMetricsGeocode } from '@/lib/hooks';
import { GEO_CONFIDENCE_THRESHOLD } from '@/lib/constants';
import { formatNumber } from '@/lib/format';
import type { CommitmentRow } from '@/lib/types';
import { errorText, isPublishedSnapshot, measurePct } from '../measure';
import { selectionFromCommitment, type FeederSelection } from '../selection';
import { useCommitmentPage, useDemo, useFreshness } from '../useConsoleData';
import FeederDetailPanel from '../FeederDetailPanel';
import { GapNote, LoadingRows, MetricTile, PageHeader, SortTable, StateBlock, StatusPill } from '../ui';

type ExceptionRow = CommitmentRow & { reason: string };

export default function GeocodingReview() {
  const demo = useDemo();
  const freshness = useFreshness(demo);
  const published = isPublishedSnapshot(freshness.data);
  const [selected, setSelected] = useState<FeederSelection | null>(null);
  const metrics = useMetricsGeocode();
  const silver = useQuery({
    queryKey: queryKeys.silverGeocode(),
    queryFn: getLayersSilverGeocode,
    enabled: !demo,
  });
  const commitments = useCommitmentPage(demo, { limit: 500, offset: 0 });
  const exceptions = useMemo(() => {
    return (commitments.data?.commitments ?? []).flatMap((row): ExceptionRow[] => {
      if (row.lat == null || row.lon == null) return [{ ...row, reason: 'No coordinates' }];
      if (row.geocode_confidence == null) return [{ ...row, reason: 'Confidence not scored' }];
      if (row.geocode_confidence < GEO_CONFIDENCE_THRESHOLD) return [{ ...row, reason: 'Confidence below 0.70' }];
      return [];
    });
  }, [commitments.data]);

  const population = metrics.data?.total_latest;

  return (
    <div>
      <PageHeader
        title="Geocoding Review"
        description="Location confidence is separate from the published supply commitment. Rows without a score are listed as not scored."
        productionHref="/layers/silver"
        productionLabel="Open Silver layer"
      />
      <GapNote>
        Exceptions come from the loaded commitments page plus the geocode metrics endpoint. There is no dedicated exceptions API. A missing coordinate is not stored as zero latitude.
      </GapNote>
      {!published && !freshness.isLoading && !demo && (
        <StateBlock tone="awaiting" title="No published locations to review" />
      )}
      <section className="pc-metrics">
        <MetricTile
          label="Geocode coverage"
          value={measurePct(demo ? 60 : metrics.data?.geocode_coverage_pct, demo ? 5 : population)}
          detail={population == null && !demo ? 'Population not returned' : 'Share of latest rows with a location'}
          demo={demo}
        />
        <MetricTile
          label="Geocoded rows"
          value={demo ? '3' : metrics.data?.geocoded_latest_count == null ? '—' : formatNumber(metrics.data.geocoded_latest_count)}
          detail={demo ? 'Sample' : metrics.data?.total_latest == null ? 'Total not returned' : `of ${formatNumber(metrics.data.total_latest)}`}
          demo={demo}
        />
        <MetricTile
          label="Needs review in loaded page"
          value={commitments.isLoading ? '…' : formatNumber(exceptions.length)}
          detail="No coordinates, unscored, or below 0.70"
          demo={demo}
        />
      </section>
      {silver.data && (silver.data.total != null || silver.data.geocode_coverage_pct != null) && (
        <p className="pc-gap">
          Silver geocode endpoint: coverage {measurePct(silver.data.geocode_coverage_pct, silver.data.total)}
          {silver.data.geocoded != null && silver.data.total != null ? `, ${formatNumber(silver.data.geocoded)} of ${formatNumber(silver.data.total)}` : ''}.
        </p>
      )}
      {metrics.isError && <StateBlock tone="error" title="Geocode metrics could not be loaded">{errorText(metrics.error)}</StateBlock>}
      {commitments.isLoading && <LoadingRows />}
      {commitments.isError && <StateBlock tone="error" title="Commitment locations could not be loaded">{errorText(commitments.error)}</StateBlock>}
      {(published || demo) && !commitments.isLoading && !commitments.isError && (
        <div className="pc-work">
          <div className="pc-work-main">
            <SortTable<ExceptionRow>
              caption="Geocoding exceptions"
              rows={exceptions}
              rowKey={(row) => `${selectionFromCommitment(row).id}:${row.reason}`}
              selectedKey={selected?.id}
              onRow={(row) => setSelected(selectionFromCommitment(row))}
              empty={<StateBlock tone="empty" title="No geocoding exceptions in the loaded page" />}
              columns={[
                { id: 'feeder', header: 'Feeder', sticky: true, sortValue: (row) => row.feeder_name, cell: (row) => row.feeder_name },
                { id: 'disco', header: 'DisCo', sortValue: (row) => row.disco_code, cell: (row) => row.disco_code },
                {
                  id: 'reason',
                  header: 'Exception',
                  sortValue: (row) => row.reason,
                  cell: (row) => <StatusPill tone={row.reason === 'No coordinates' ? 'warn' : 'neutral'}>{row.reason}</StatusPill>,
                },
                {
                  id: 'confidence',
                  header: 'Confidence',
                  align: 'right',
                  sortValue: (row) => row.geocode_confidence ?? null,
                  cell: (row) => <span className="pc-num">{row.geocode_confidence == null ? 'Not scored' : formatNumber(row.geocode_confidence, 2)}</span>,
                },
              ]}
            />
          </div>
          <FeederDetailPanel selection={selected} onClose={() => setSelected(null)} />
        </div>
      )}
    </div>
  );
}
