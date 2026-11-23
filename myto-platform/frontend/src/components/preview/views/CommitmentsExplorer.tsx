'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useGlobalFilters } from '@/lib/hooks';
import { getExportCommitmentsCsvUrl, getExportCommitmentsParquetUrl } from '@/lib/api';
import { formatNumber } from '@/lib/format';
import type { CommitmentRow } from '@/lib/types';
import { errorText, isPublishedSnapshot } from '../measure';
import { selectionFromCommitment } from '../selection';
import type { FeederSelection } from '../selection';
import { useCommitmentPage, useDemo, useDiscoList, useFreshness, useMonthList, usePreviewHref } from '../useConsoleData';
import FeederDetailPanel from '../FeederDetailPanel';
import { CountLabel, FilterChip, LoadingRows, PageHeader, SortTable, StateBlock } from '../ui';

const PAGE_SIZE = 50;

function hoursLabel(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return 'Not published';
  return formatNumber(value);
}

export default function CommitmentsExplorer() {
  const demo = useDemo();
  const href = usePreviewHref();
  const { filters, setFilters, setSearch } = useGlobalFilters();
  const [draftSearch, setDraftSearch] = useState(filters.search);
  const [draftBand, setDraftBand] = useState(filters.band);
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<FeederSelection | null>(null);

  useEffect(() => setDraftSearch(filters.search), [filters.search]);
  useEffect(() => setDraftBand(filters.band), [filters.band]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (draftSearch !== filters.search) setSearch(draftSearch);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [draftSearch, filters.search, setSearch]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (draftBand !== filters.band) setFilters({ band: draftBand });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [draftBand, filters.band, setFilters]);
  useEffect(() => {
    setOffset(0);
  }, [filters.disco, filters.year, filters.month, filters.band, filters.search]);

  const freshness = useFreshness(demo);
  const discos = useDiscoList(demo);
  const months = useMonthList(demo, filters.disco);
  const published = isPublishedSnapshot(freshness.data);
  const query = useMemo(
    () => ({
      disco_code: filters.disco || undefined,
      year: filters.year ?? undefined,
      month: filters.month || undefined,
      band: filters.band || undefined,
      q: filters.search || undefined,
      limit: PAGE_SIZE,
      offset,
    }),
    [filters, offset]
  );
  const result = useCommitmentPage(demo, query);
  const rows = result.data?.commitments ?? [];
  const total = typeof result.data?.meta?.count === 'number' ? result.data.meta.count : null;

  const exportParams = {
    disco: filters.disco || undefined,
    year: filters.year ?? undefined,
    month: filters.month || undefined,
    band: filters.band || undefined,
  };
  const scopeParts = [
    exportParams.disco ? `DisCo ${exportParams.disco}` : 'all DisCos',
    exportParams.year != null ? String(exportParams.year) : null,
    exportParams.month || null,
    exportParams.band ? `band ${exportParams.band}` : null,
  ].filter(Boolean);
  const scope = scopeParts.join(', ');
  const searchNote = filters.search
    ? ` Feeder search “${filters.search}” is not sent. The export endpoint has no search parameter.`
    : '';

  const monthValue = filters.year != null && filters.month ? `${filters.year}|${filters.month}` : '';

  return (
    <div>
      <PageHeader
        title="Commitments Explorer"
        period={freshness.isLoading ? 'Loading…' : published ? freshness.data?.month_range || 'Not provided' : 'Not published'}
        description="Filters apply to the latest published snapshot. The feeder name stays visible while the table scrolls."
        productionHref="/explorer"
      />
      <div className="pc-split">
        <form className="pc-filters" aria-label="Commitment filters" onSubmit={(event) => event.preventDefault()}>
          <label>
            DisCo
            <select
              value={filters.disco}
              onChange={(event) => setFilters({ disco: event.target.value })}
            >
              <option value="">All DisCos</option>
              {(discos.data ?? []).map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          </label>
          <label>
            Reporting month
            <select
              value={monthValue}
              onChange={(event) => {
                if (!event.target.value) {
                  setFilters({ year: null, month: '' });
                  return;
                }
                const [year, month] = event.target.value.split('|');
                setFilters({ year: Number(year), month });
              }}
            >
              <option value="">All months</option>
              {(months.data ?? []).map((month) => (
                <option key={`${month.year}-${month.month_name}`} value={`${month.year}|${month.month_name}`}>
                  {month.month_name} {month.year}
                </option>
              ))}
            </select>
          </label>
          <label>
            Service band
            <input
              value={draftBand}
              onChange={(event) => setDraftBand(event.target.value)}
              placeholder="A, B, C…"
              aria-label="Service band"
            />
          </label>
          <label>
            Feeder search
            <input
              value={draftSearch}
              onChange={(event) => setDraftSearch(event.target.value)}
              placeholder="Feeder name or location"
              aria-label="Feeder search"
            />
          </label>
          <button
            type="button"
            className="pc-btn"
            onClick={() => {
              setDraftSearch('');
              setDraftBand('');
              setFilters({ disco: '', year: null, month: '', band: '', search: '' });
            }}
          >
            Clear filters
          </button>
        </form>

        <div>
          <div className="pc-chips" aria-label="Active filters">
            {filters.disco && (
              <FilterChip label={`DisCo ${filters.disco}`} onRemove={() => setFilters({ disco: '' })} />
            )}
            {filters.month && (
              <FilterChip
                label={`${filters.month} ${filters.year ?? ''}`.trim()}
                onRemove={() => setFilters({ month: '', year: null })}
              />
            )}
            {filters.band && (
              <FilterChip label={`Band ${filters.band}`} onRemove={() => { setDraftBand(''); setFilters({ band: '' }); }} />
            )}
            {filters.search && (
              <FilterChip label={`Search ${filters.search}`} onRemove={() => { setDraftSearch(''); setSearch(''); }} />
            )}
          </div>
          <div className="pc-toolbar">
            {result.isLoading ? <p className="pc-count">Results loading</p> : <CountLabel shown={rows.length} total={total} />}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <a className="pc-btn" href={getExportCommitmentsCsvUrl(exportParams)}>
                Download CSV
              </a>
              <a className="pc-btn" href={getExportCommitmentsParquetUrl(exportParams)}>
                Download Parquet
              </a>
            </div>
          </div>
          <p className="pc-gap">
            CSV covers the latest snapshot for {scope}.{searchNote} Parquet uses that same DisCo, year, month, and band scope. The current API returns HTTP 501 for Parquet.
          </p>

          {freshness.isError && (
            <StateBlock tone="error" title="Snapshot status could not be loaded">
              {errorText(freshness.error)}
            </StateBlock>
          )}
          {!freshness.isLoading && !freshness.isError && !published && !demo && (
            <StateBlock tone="awaiting" title="No published snapshot">
              Filters are ready. Results will appear after the first national dataset is promoted.
            </StateBlock>
          )}
          {result.isLoading && <LoadingRows />}
          {result.isError && (
            <StateBlock tone="error" title="Commitments could not be loaded">
              {errorText(result.error)}
            </StateBlock>
          )}
          {!result.isLoading && !result.isError && (published || demo) && (
            <div className="pc-work">
              <div className="pc-work-main">
                <SortTable<CommitmentRow>
                  caption="Published feeder commitments"
                  rows={rows}
                  rowKey={(row) => selectionFromCommitment(row).id}
                  selectedKey={selected?.id}
                  onRow={(row) => setSelected(selectionFromCommitment(row))}
                  empty={
                    <StateBlock tone="empty" title="No matching results">
                      No published commitments match the active filters.
                    </StateBlock>
                  }
                  columns={[
                    {
                      id: 'feeder',
                      header: 'Feeder',
                      sticky: true,
                      sortValue: (row) => row.feeder_name,
                      cell: (row) => row.feeder_name || '—',
                    },
                    {
                      id: 'disco',
                      header: 'DisCo',
                      sortValue: (row) => row.disco_code,
                      cell: (row) => (
                        <Link href={href(`/discos/${encodeURIComponent(row.disco_code)}`)}>{row.disco_code}</Link>
                      ),
                    },
                    {
                      id: 'period',
                      header: 'Period',
                      sortValue: (row) => `${row.year}-${row.month_name}`,
                      cell: (row) => `${row.month_name} ${row.year}`,
                    },
                    {
                      id: 'band',
                      header: 'Band',
                      sortValue: (row) => row.band ?? null,
                      cell: (row) => row.band || '—',
                    },
                    {
                      id: 'hours',
                      header: 'Published hours',
                      align: 'right',
                      sortValue: (row) => row.min_supply_hours,
                      cell: (row) => <span className="pc-num">{hoursLabel(row.min_supply_hours)}</span>,
                    },
                    {
                      id: 'location',
                      header: 'Location',
                      sortValue: (row) => row.feeder_location,
                      cell: (row) => row.feeder_location || '—',
                    },
                    {
                      id: 'confidence',
                      header: 'Location confidence',
                      align: 'right',
                      sortValue: (row) => row.geocode_confidence ?? null,
                      cell: (row) => (
                        <span className="pc-num">
                          {row.geocode_confidence == null ? 'Not scored' : formatNumber(row.geocode_confidence, 2)}
                        </span>
                      ),
                    },
                  ]}
                />
                <div className="pc-toolbar" style={{ marginTop: 8 }}>
                  <button type="button" className="pc-btn" disabled={offset === 0} onClick={() => setOffset((value) => Math.max(0, value - PAGE_SIZE))}>
                    Previous
                  </button>
                  <span className="pc-num">{offset + 1}–{offset + rows.length}</span>
                  <button
                    type="button"
                    className="pc-btn"
                    disabled={total != null ? offset + rows.length >= total : rows.length < PAGE_SIZE}
                    onClick={() => setOffset((value) => value + PAGE_SIZE)}
                  >
                    Next
                  </button>
                </div>
              </div>
              <FeederDetailPanel selection={selected} onClose={() => setSelected(null)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
