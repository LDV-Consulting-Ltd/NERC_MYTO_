'use client';

import Link from 'next/link';
import { formatDate, formatNumber } from '@/lib/format';
import {
  coverageTone,
  errorText,
  isPartialPct,
  isPublishedSnapshot,
  measureCount,
  measurePct,
  reportingPeriod,
  rollupDiscos,
  shareLabel,
} from '../measure';
import { useCommitmentPage, useCoverage, useDemo, useDiscoList, useFreshness, usePreviewHref } from '../useConsoleData';
import { GapNote, LoadingRows, MetricTile, PageHeader, SortTable, StateBlock, StatusPill } from '../ui';
import type { DiscoRollup } from '../measure';

const LOAD_LIMIT = 500;

export default function NationalOverview() {
  const demo = useDemo();
  const href = usePreviewHref();
  const freshness = useFreshness(demo);
  const coverage = useCoverage(demo);
  const discos = useDiscoList(demo);
  const commitments = useCommitmentPage(demo, { limit: LOAD_LIMIT, offset: 0 });

  const published = isPublishedSnapshot(freshness.data);
  const period = published ? reportingPeriod(freshness.data) : 'Not published';
  const population = published ? freshness.data?.total_rows ?? null : null;
  const evidencePopulation = coverage.data?.total_records ?? null;

  const loaded = commitments.data?.commitments ?? [];
  const reportedCount = commitments.data?.meta?.count;
  const loadedAll = reportedCount == null ? loaded.length < LOAD_LIMIT : loaded.length >= reportedCount;
  const rollups = rollupDiscos(loaded, discos.data ?? [], loadedAll);
  const tone = coverageTone(coverage.data);

  return (
    <div>
      <PageHeader
        title="National Overview"
        period={freshness.isLoading ? 'Loading…' : period}
        description="DisCo coverage is the entry point. Open a profile or the filtered explorer from any row."
        productionHref="/"
        actions={
          <>
            <Link className="pc-btn pc-btn-primary" href={href('/commitments')}>
              Explore commitments
            </Link>
            <Link className="pc-btn" href={href('/map')}>
              Open feeder map
            </Link>
          </>
        }
      />

      {published && freshness.data?.refreshed_at && (
        <p className="pc-lede" style={{ marginTop: -8, marginBottom: 12 }}>
          Snapshot published {formatDate(freshness.data.refreshed_at)}
          {freshness.data.latest_run_id ? ` · run ${String(freshness.data.latest_run_id).slice(0, 8)}` : ''}
          {tone === 'partial' && (
            <>
              {' '}
              <StatusPill tone="warn">Partial coverage</StatusPill>
            </>
          )}
        </p>
      )}

      {freshness.isLoading && <LoadingRows />}
      {freshness.isError && (
        <StateBlock tone="error" title="National snapshot could not be loaded">
          {errorText(freshness.error)} The overview does not substitute zero for a failed request.
        </StateBlock>
      )}
      {!freshness.isLoading && !freshness.isError && !published && (
        <StateBlock tone="awaiting" title="Awaiting the first national dataset">
          No published snapshot is available yet. DisCo coverage, feeder records, and source evidence will appear after a snapshot is promoted. Missing measurements stay unpublished rather than zero.
        </StateBlock>
      )}

      {!freshness.isLoading && !freshness.isError && published && (
        <section className="pc-metrics" aria-label="National coverage">
          <MetricTile
            label="DisCo coverage"
            value={measureCount(freshness.data?.disco_count, true)}
            detail="Distribution companies in the published snapshot"
            demo={demo}
          />
          <MetricTile
            label="Feeder records"
            value={measureCount(freshness.data?.total_rows, population != null)}
            detail="Commitment rows in the latest snapshot"
            demo={demo}
          />
          <MetricTile
            label="Source evidence coverage"
            value={measurePct(coverage.data?.extraction_coverage_pct, evidencePopulation)}
            detail={
              coverage.isError
                ? 'Coverage endpoint failed'
                : isPartialPct(coverage.data?.extraction_coverage_pct, evidencePopulation)
                  ? 'Partial — not every loaded record has extraction evidence'
                  : 'Share of records with extraction evidence'
            }
            demo={demo}
          />
        </section>
      )}

      {published && (
        <section className="pc-card">
          <div className="pc-card-h">
            <h2>DisCo coverage</h2>
            {!loadedAll && (
              <StatusPill tone="warn">Partial page</StatusPill>
            )}
          </div>
          <div className="pc-card-b">
            {commitments.isLoading && <LoadingRows />}
            {commitments.isError && (
              <StateBlock tone="error" title="DisCo table could not be loaded">
                {errorText(commitments.error)}
              </StateBlock>
            )}
            {!commitments.isLoading && !commitments.isError && !loadedAll && (
              <GapNote>
                Counts use the first {loaded.length.toLocaleString()} commitment records returned
                {reportedCount != null ? ` of ${reportedCount.toLocaleString()}` : ''}. DisCos absent from that page are marked “Not in loaded page”, not zero. Open a profile for that company’s own query.
              </GapNote>
            )}
            {!commitments.isLoading && !commitments.isError && (
              <SortTable<DiscoRollup>
                caption="DisCo coverage"
                rows={rollups}
                rowKey={(row) => row.code}
                empty={<StateBlock tone="empty" title="No DisCos in the published snapshot" />}
                columns={[
                  {
                    id: 'code',
                    header: 'DisCo',
                    sticky: true,
                    sortValue: (row) => row.code,
                    cell: (row) => (
                      <Link href={href(`/discos/${encodeURIComponent(row.code)}`)}>{row.code}</Link>
                    ),
                  },
                  {
                    id: 'records',
                    header: loadedAll ? 'Records' : 'Records in loaded page',
                    align: 'right',
                    sortValue: (row) => row.records,
                    cell: (row) => (
                      <span className="pc-num">{row.records == null ? 'Not in loaded page' : formatNumber(row.records)}</span>
                    ),
                  },
                  {
                    id: 'periods',
                    header: 'Periods',
                    align: 'right',
                    sortValue: (row) => row.periods,
                    cell: (row) => <span className="pc-num">{row.periods == null ? 'Not in loaded page' : row.periods}</span>,
                  },
                  {
                    id: 'mapped',
                    header: 'Mapped',
                    align: 'right',
                    sortValue: (row) => row.mapped,
                    cell: (row) => <span className="pc-num">{shareLabel(row.mapped, row.records)}</span>,
                  },
                  {
                    id: 'evidence',
                    header: 'With source',
                    align: 'right',
                    sortValue: (row) => row.evidenced,
                    cell: (row) => <span className="pc-num">{shareLabel(row.evidenced, row.records)}</span>,
                  },
                  {
                    id: 'open',
                    header: 'Open',
                    cell: (row) => (
                      <span style={{ display: 'inline-flex', gap: 8 }}>
                        <Link href={href('/commitments', { disco: row.code })}>Explorer</Link>
                        <Link href={href('/map', { disco: row.code })}>Map</Link>
                      </span>
                    ),
                  },
                ]}
              />
            )}
          </div>
        </section>
      )}
    </div>
  );
}
