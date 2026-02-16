'use client';

import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { getLatestCommitments, getLatestMapPoints, getDqSummary } from '@/lib/api';
import MapView from '@/components/MapView';
import DQScoreCard from '@/components/DQScoreCard';
import DataTable from '@/components/DataTable';
import EvidenceLink from '@/components/EvidenceLink';
import type { CommitmentRow } from '@/lib/types';
import type { ColumnDef } from '@tanstack/react-table';
import { formatNumber, formatConfidence } from '@/lib/format';

export default function DiscoProfilePage() {
  const params = useParams();
  const discoCode = (params?.disco_code as string) ?? '';

  const { data: commitmentsData } = useQuery({
    queryKey: queryKeys.commitments({ disco_code: discoCode }),
    queryFn: () => getLatestCommitments({ disco_code: discoCode, limit: 200, offset: 0 }),
    enabled: !!discoCode,
  });
  const { data: mapData } = useQuery({
    queryKey: queryKeys.mapPoints({ disco_code: discoCode }),
    queryFn: () => getLatestMapPoints({ disco_code: discoCode }),
    enabled: !!discoCode,
  });
  const { data: dqData } = useQuery({
    queryKey: queryKeys.dqSummary(),
    queryFn: () => getDqSummary(),
  });

  const commitments = commitmentsData?.commitments ?? [];
  const geojson = useMemo(() => {
    if (!mapData?.features?.length) return null;
    return { type: 'FeatureCollection' as const, features: mapData.features };
  }, [mapData]);

  const columns: ColumnDef<CommitmentRow, unknown>[] = useMemo(
    () => [
      { header: 'Month', accessorFn: (r) => `${r.month_name} ${r.year}`, cell: (c) => c.getValue() as string },
      { header: 'Band', accessorKey: 'band', cell: (c) => (c.getValue() as string) ?? '—' },
      { header: 'Feeder', accessorKey: 'feeder_name', cell: (c) => c.getValue() as string },
      { header: 'Min hours', accessorKey: 'min_supply_hours', cell: (c) => formatNumber(c.getValue() as number) },
      { header: 'Evidence', cell: ({ row }) => <EvidenceLink pdfUrl={row.original.source_pdf_url} pageNo={row.original.source_page_no} /> },
    ],
    []
  );

  if (!discoCode) {
    return <p className="text-[var(--ldv-text-muted)]">Missing disco.</p>;
  }

  return (
    <div>
      <div className="mb-4">
        <Link href="/discos" className="text-support text-sm hover:underline">← Discos</Link>
        <h1 className="text-xl font-semibold text-primary mt-1">Disco: {discoCode}</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="kpi-card p-4">
          <div className="text-xs text-[var(--ldv-text-muted)]">Rows</div>
          <div className="text-xl font-semibold text-primary">{commitments.length}</div>
        </div>
        <div className="kpi-card p-4">
          <div className="text-xs text-[var(--ldv-text-muted)]">Geocode coverage</div>
          <div className="text-xl font-semibold text-primary">
            {commitments.length
              ? formatNumber(
                  (commitments.filter((c) => c.lat != null && c.lon != null).length / commitments.length) * 100,
                  1
                ) + '%'
              : '—'}
          </div>
        </div>
        <DQScoreCard dqScore={dqData?.dq_score} totalRecords={dqData?.total_records} />
      </div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-primary mb-2">Map (scoped)</h2>
        {geojson && <MapView geojson={geojson} />}
        {!geojson?.features?.length && <p className="text-[var(--ldv-text-muted)]">No points for this disco.</p>}
      </div>
      <div>
        <h2 className="text-lg font-semibold text-primary mb-2">Table (scoped)</h2>
        <DataTable<CommitmentRow> columns={columns} data={commitments} pageSize={20} />
      </div>
    </div>
  );
}
