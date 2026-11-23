'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useGlobalFilters } from '@/lib/hooks';
import type { CommitmentRow } from '@/lib/types';
import { errorText, isPublishedSnapshot } from '../measure';
import { selectionFromCommitment, type FeederSelection } from '../selection';
import { useCommitmentPage, useDemo, useFreshness, usePreviewHref } from '../useConsoleData';
import FeederDetailPanel from '../FeederDetailPanel';
import { GapNote, LoadingRows, PageHeader, SortTable, StateBlock } from '../ui';

type OrderRow = {
  url: string;
  discos: string;
  periods: string;
  records: number;
  rows: CommitmentRow[];
};

export default function RegulatoryOrders() {
  const demo = useDemo();
  const href = usePreviewHref();
  const search = useSearchParams();
  const focus = search.get('doc');
  const { filters } = useGlobalFilters();
  const freshness = useFreshness(demo);
  const published = isPublishedSnapshot(freshness.data);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(focus);
  const [selected, setSelected] = useState<FeederSelection | null>(null);
  const result = useCommitmentPage(demo, {
    disco_code: filters.disco || undefined,
    year: filters.year ?? undefined,
    month: filters.month || undefined,
    band: filters.band || undefined,
    q: filters.search || undefined,
    limit: 500,
    offset: 0,
  });

  const orders = useMemo(() => {
    const grouped = new Map<string, CommitmentRow[]>();
    for (const row of result.data?.commitments ?? []) {
      if (!row.source_pdf_url) continue;
      const list = grouped.get(row.source_pdf_url) ?? [];
      list.push(row);
      grouped.set(row.source_pdf_url, list);
    }
    return [...grouped.entries()].map(([url, rows]): OrderRow => ({
      url,
      records: rows.length,
      discos: [...new Set(rows.map((row) => row.disco_code))].join(', '),
      periods: [...new Set(rows.map((row) => `${row.month_name} ${row.year}`))].join(', '),
      rows,
    }));
  }, [result.data]);

  const active = orders.find((order) => order.url === selectedDoc) ?? null;
  const missingSource = (result.data?.commitments ?? []).filter((row) => !row.source_pdf_url).length;
  const reported = result.data?.meta?.count;
  const partial = typeof reported === 'number' && (result.data?.commitments.length ?? 0) < reported;

  return (
    <div>
      <PageHeader
        title="Regulatory Orders"
        period={freshness.isLoading ? 'Loading…' : published ? freshness.data?.month_range || 'Not provided' : 'Not published'}
        description="Source documents are the PDF references stored on published commitment rows. Each document links back to the records that cite it."
        productionHref="/explorer"
        productionLabel="Open explorer evidence"
      />
      <GapNote>
        There is no orders endpoint. This view groups `source_pdf_url` from the commitments API. A document can be opened directly, and each derived feeder links back to the filtered explorer.
      </GapNote>
      {!published && !freshness.isLoading && !demo && (
        <StateBlock tone="awaiting" title="No published source documents">
          Orders appear when a snapshot contains commitment rows with source PDFs.
        </StateBlock>
      )}
      {result.isLoading && <LoadingRows />}
      {result.isError && <StateBlock tone="error" title="Orders could not be loaded">{errorText(result.error)}</StateBlock>}
      {partial && (
        <GapNote>
          Document groups use the first {(result.data?.commitments.length ?? 0).toLocaleString()} of {reported?.toLocaleString()} records. A document that appears only later in the snapshot will be missing from this page.
        </GapNote>
      )}
      {(published || demo) && !result.isLoading && !result.isError && (
        <div className="pc-work">
          <div className="pc-work-main">
            <SortTable<OrderRow>
              caption="Source documents cited by loaded commitments"
              rows={orders}
              rowKey={(row) => row.url}
              selectedKey={selectedDoc}
              onRow={(row) => setSelectedDoc(row.url)}
              empty={<StateBlock tone="empty" title="No source documents on the loaded records" />}
              columns={[
                {
                  id: 'doc',
                  header: 'Document',
                  sticky: true,
                  sortValue: (row) => row.url,
                  cell: (row) => (
                    <a href={row.url} target="_blank" rel="noopener noreferrer">
                      {row.url.replace(/^https?:\/\//, '')}
                    </a>
                  ),
                },
                { id: 'discos', header: 'DisCos', sortValue: (row) => row.discos, cell: (row) => row.discos },
                { id: 'periods', header: 'Periods', sortValue: (row) => row.periods, cell: (row) => row.periods },
                { id: 'records', header: 'Derived records', align: 'right', sortValue: (row) => row.records, cell: (row) => <span className="pc-num">{row.records}</span> },
              ]}
            />
            {missingSource > 0 && (
              <p className="pc-gap">{missingSource.toLocaleString()} loaded records have no source document and are excluded from this list.</p>
            )}
            {active && (
              <section className="pc-card" style={{ marginTop: 12 }}>
                <div className="pc-card-h">
                  <h2>Records derived from this document</h2>
                </div>
                <div className="pc-card-b">
                  <p className="pc-gap">{active.url}</p>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {active.rows.map((row) => {
                      const item = selectionFromCommitment(row);
                      return (
                        <li key={item.id} style={{ marginBottom: 6 }}>
                          <button type="button" className="pc-btn pc-btn-ghost" onClick={() => setSelected(item)}>
                            {row.feeder_name}
                          </button>
                          {' '}
                          {row.disco_code} · {row.month_name} {row.year} · page {row.source_page_no ?? '—'}
                          {' · '}
                          <Link href={href('/commitments', { disco: row.disco_code, year: row.year, month: row.month_name, q: row.feeder_name })}>
                            Open in explorer
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </section>
            )}
          </div>
          <FeederDetailPanel selection={selected} onClose={() => setSelected(null)} />
        </div>
      )}
    </div>
  );
}
