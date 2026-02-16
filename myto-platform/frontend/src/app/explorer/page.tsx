'use client';

import { useState, useMemo, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useGlobalFilters } from '@/lib/hooks';
import { queryKeys } from '@/lib/queryKeys';
import { getLatestCommitments } from '@/lib/api';
import { getExportCommitmentsCsvUrl, getExportCommitmentsParquetUrl } from '@/lib/api';
import DataTable from '@/components/DataTable';
import DrillThroughPanel from '@/components/DrillThroughPanel';
import EvidenceLink from '@/components/EvidenceLink';
import { EvidenceBadge, ConfidenceBadge } from '@/components/TrustBadges';
import type { CommitmentRow } from '@/lib/types';
import type { ColumnDef } from '@tanstack/react-table';
import { formatNumber } from '@/lib/format';
import { PAGINATION_DEFAULT_LIMIT } from '@/lib/constants';

function ExplorerPageContent() {
  const { filters, toApiParams } = useGlobalFilters();
  const [selectedFeederKey, setSelectedFeederKey] = useState<number | null>(null);
  const [selectedRow, setSelectedRow] = useState<CommitmentRow | null>(null);

  const apiParams = useMemo(
    () => ({
      ...toApiParams(),
      limit: PAGINATION_DEFAULT_LIMIT,
      offset: 0,
    }),
    [toApiParams]
  );

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.commitments(apiParams),
    queryFn: () => getLatestCommitments(apiParams),
    staleTime: 60 * 1000,
  });

  const commitments = data?.commitments ?? [];

  const columns = useMemo<ColumnDef<CommitmentRow, unknown>[]>(
    () => [
      { header: 'Disco', accessorKey: 'disco_code', cell: (c) => c.getValue() as string },
      { header: 'Month', accessorFn: (r) => `${r.month_name} ${r.year}`, cell: (c) => c.getValue() as string },
      { header: 'Band', accessorKey: 'band', cell: (c) => (c.getValue() as string) ?? '—' },
      { header: 'Feeder', accessorKey: 'feeder_name', cell: (c) => c.getValue() as string },
      { header: 'Location', accessorKey: 'feeder_location', cell: (c) => (c.getValue() as string)?.slice(0, 40) ?? '—' },
      { header: 'Min hours', accessorKey: 'min_supply_hours', cell: (c) => formatNumber(c.getValue() as number) },
      {
        header: 'Confidence',
        accessorKey: 'geocode_confidence',
        cell: ({ row }) => (
          <ConfidenceBadge value={row.original.geocode_confidence} />
        ),
      },
      {
        header: 'Evidence',
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5">
            <EvidenceBadge pdfUrl={row.original.source_pdf_url} pageNo={row.original.source_page_no} />
            <EvidenceLink
              pdfUrl={row.original.source_pdf_url}
              pageNo={row.original.source_page_no}
            />
          </span>
        ),
      },
    ],
    []
  );

  const exportParams = useMemo(
    () => ({
      disco: filters.disco || undefined,
      year: filters.year ?? undefined,
      month: filters.month || undefined,
      band: filters.band || undefined,
    }),
    [filters]
  );

  return (
    <div className="flex gap-4">
      <div className="flex-1 min-w-0">
        <h1 className="text-2xl font-semibold text-[var(--ldv-primary)] tracking-tight mb-2">National Explorer</h1>
        <p className="text-sm text-[var(--ldv-text-muted)] mb-4">
          Query commitment data with filters. Row click opens feeder detail and evidence links.
        </p>
        <div className="flex gap-2 mb-4">
          <a
            href={getExportCommitmentsCsvUrl(exportParams)}
            download
            className="btn-secondary"
          >
            Export CSV
          </a>
          <a
            href={getExportCommitmentsParquetUrl(exportParams)}
            download
            className="btn-secondary"
          >
            Export Parquet
          </a>
        </div>
        {error && (
          <p className="text-red-600 py-2">Failed to load commitments.</p>
        )}
        {isLoading && <p className="text-[var(--ldv-text-muted)]">Loading…</p>}
        {!isLoading && !error && (
          <DataTable<CommitmentRow>
            columns={columns}
            data={commitments}
            pageSize={20}
            onRowClick={(row) => {
              const r = row.original;
              setSelectedRow(r);
              setSelectedFeederKey(r.feeder_key ?? null);
            }}
          />
        )}
      </div>
      {(selectedFeederKey != null || selectedRow) && (
        <DrillThroughPanel
          feederKey={selectedFeederKey}
          onClose={() => {
            setSelectedFeederKey(null);
            setSelectedRow(null);
          }}
          fallbackRow={selectedRow ?? undefined}
        />
      )}
    </div>
  );
}

export default function ExplorerPage() {
  return (
    <Suspense fallback={<div className="text-[var(--ldv-text-muted)] p-4">Loading…</div>}>
      <ExplorerPageContent />
    </Suspense>
  );
}
