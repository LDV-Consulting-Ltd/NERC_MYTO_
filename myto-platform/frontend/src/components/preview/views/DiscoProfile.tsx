'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getLatestMapPoints } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { formatNumber } from '@/lib/format';
import type { CommitmentRow } from '@/lib/types';
import { demoMapFeatures, filterDemoCommitments } from '../demoData';
import { errorText } from '../measure';
import { selectionFromCommitment, type FeederSelection } from '../selection';
import { useCommitmentPage, useDemo, usePreviewHref } from '../useConsoleData';
import FeederDetailPanel from '../FeederDetailPanel';
import { GapNote, LoadingRows, MetricTile, PageHeader, SortTable, StateBlock, StatusPill } from '../ui';

export default function DiscoProfile() {
  const params = useParams();
  const pathname = usePathname() ?? '';
  const fromParams = (params?.disco_code as string) || (params?.code as string) || '';
  const fromPath = pathname.match(/\/(?:discos|disco)\/([^/]+)$/)?.[1] ?? '';
  const code = decodeURIComponent(fromParams || fromPath);
  const demo = useDemo();
  const href = usePreviewHref();
  const [selected, setSelected] = useState<FeederSelection | null>(null);
  const commitments = useCommitmentPage(demo, { disco_code: code, limit: 200, offset: 0 });
  const mapQuery = useQuery({
    queryKey: demo ? ['preview-demo', 'map', code] : queryKeys.mapPoints({ disco_code: code }),
    queryFn: async () =>
      demo
        ? { features: demoMapFeatures().filter((feature) => feature.properties?.disco_code === code) }
        : getLatestMapPoints({ disco_code: code }),
    enabled: Boolean(code),
  });

  const rows = commitments.data?.commitments ?? [];
  const total = commitments.data?.meta?.count;
  const partial = typeof total === 'number' && total > rows.length;
  const periods = useMemo(() => {
    const set = new Map<string, { year: number; month: string }>();
    for (const row of rows) {
      set.set(`${row.year}|${row.month_name}`, { year: row.year, month: row.month_name });
    }
    return [...set.values()];
  }, [rows]);
  const documents = useMemo(() => {
    const set = new Map<string, { url: string; page: number | null; count: number }>();
    for (const row of rows) {
      if (!row.source_pdf_url) continue;
      const current = set.get(row.source_pdf_url) ?? { url: row.source_pdf_url, page: row.source_page_no ?? null, count: 0 };
      current.count += 1;
      set.set(row.source_pdf_url, current);
    }
    return [...set.values()];
  }, [rows]);
  const mapped = rows.filter((row) => row.lat != null && row.lon != null).length;

  if (!code) return <StateBlock tone="error" title="Missing DisCo code" />;

  return (
    <div>
      <PageHeader
        title={code}
        description="Coverage, reporting periods, published feeder commitments, and the source orders those records cite."
        productionHref={`/disco/${encodeURIComponent(code)}`}
        actions={
          <>
            <Link className="pc-btn" href={href('/discos')}>All DisCos</Link>
            <Link className="pc-btn" href={href('/commitments', { disco: code })}>Explorer</Link>
            <Link className="pc-btn" href={href('/map', { disco: code })}>Map</Link>
          </>
        }
      />
      {commitments.isLoading && <LoadingRows />}
      {commitments.isError && (
        <StateBlock tone="error" title="Profile could not be loaded">{errorText(commitments.error)}</StateBlock>
      )}
      {!commitments.isLoading && !commitments.isError && rows.length === 0 && (
        <StateBlock tone="empty" title="No published commitments for this DisCo">
          The latest snapshot has no rows for {code}. This is an empty result, not a zero-hour commitment.
        </StateBlock>
      )}
      {rows.length > 0 && (
        <>
          {partial && (
            <GapNote>
              This profile loaded {rows.length.toLocaleString()} of {total?.toLocaleString()} records. Period and document lists cover the loaded page.
            </GapNote>
          )}
          <section className="pc-metrics">
            <MetricTile label="Loaded commitments" value={formatNumber(rows.length)} detail={partial ? 'Partial page' : 'Rows returned for this DisCo'} demo={demo} />
            <MetricTile label="Reporting periods" value={formatNumber(periods.length)} detail="Distinct month and year pairs in the loaded page" demo={demo} />
            <MetricTile
              label="Mapped records"
              value={`${formatNumber(mapped)} of ${formatNumber(rows.length)}`}
              detail={`${formatNumber(mapQuery.data?.features.length ?? 0)} map points returned`}
              demo={demo}
            />
          </section>
          <section className="pc-card">
            <div className="pc-card-h"><h2>Reporting periods</h2></div>
            <div className="pc-card-b" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {periods.map((period) => (
                <Link key={`${period.year}-${period.month}`} className="pc-chip" href={href('/commitments', { disco: code, year: period.year, month: period.month })}>
                  {period.month} {period.year}
                </Link>
              ))}
            </div>
          </section>
          <section className="pc-card">
            <div className="pc-card-h">
              <h2>Source orders</h2>
              <Link href={href('/orders', { disco: code })}>All orders</Link>
            </div>
            <div className="pc-card-b">
              {documents.length === 0 && <p className="pc-gap">None of the loaded records include a source PDF.</p>}
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {documents.map((doc) => (
                  <li key={doc.url} style={{ marginBottom: 6 }}>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer">{doc.url}</a>
                    <span className="pc-num"> · {formatNumber(doc.count)} derived records</span>
                    {doc.page != null && <span> · example page {doc.page}</span>}
                  </li>
                ))}
              </ul>
            </div>
          </section>
          <div className="pc-work">
            <div className="pc-work-main">
              <SortTable<CommitmentRow>
                caption={`${code} feeder commitments`}
                rows={rows}
                rowKey={(row) => selectionFromCommitment(row).id}
                selectedKey={selected?.id}
                onRow={(row) => setSelected(selectionFromCommitment(row))}
                columns={[
                  { id: 'feeder', header: 'Feeder', sticky: true, sortValue: (row) => row.feeder_name, cell: (row) => row.feeder_name },
                  { id: 'period', header: 'Period', sortValue: (row) => `${row.year}-${row.month_name}`, cell: (row) => `${row.month_name} ${row.year}` },
                  { id: 'band', header: 'Band', sortValue: (row) => row.band ?? null, cell: (row) => row.band || '—' },
                  {
                    id: 'hours',
                    header: 'Published hours',
                    align: 'right',
                    sortValue: (row) => row.min_supply_hours,
                    cell: (row) => <span className="pc-num">{row.min_supply_hours == null ? 'Not published' : formatNumber(row.min_supply_hours)}</span>,
                  },
                  {
                    id: 'source',
                    header: 'Source',
                    cell: (row) => row.source_pdf_url ? <StatusPill tone="ok">Linked</StatusPill> : <StatusPill tone="warn">No document</StatusPill>,
                  },
                ]}
              />
            </div>
            <FeederDetailPanel selection={selected} onClose={() => setSelected(null)} />
          </div>
        </>
      )}
    </div>
  );
}
