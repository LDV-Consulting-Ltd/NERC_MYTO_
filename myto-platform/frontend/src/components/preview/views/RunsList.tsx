'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { getRuns } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { formatDate } from '@/lib/format';
import type { RunSummary } from '@/lib/types';
import { errorText } from '../measure';
import { useDemo, usePreviewHref } from '../useConsoleData';
import { LoadingRows, PageHeader, SortTable, StateBlock, StatusPill } from '../ui';

function tone(status: string): 'ok' | 'warn' | 'danger' | 'neutral' {
  if (status === 'success') return 'ok';
  if (status === 'failed') return 'danger';
  if (status === 'running') return 'warn';
  return 'neutral';
}

export default function RunsList() {
  const demo = useDemo();
  const href = usePreviewHref();
  const runs = useQuery({
    queryKey: queryKeys.runs(50, 0),
    queryFn: () => getRuns(50, 0),
    enabled: !demo,
  });
  const rows = runs.data ?? [];

  return (
    <div>
      <PageHeader
        title="Pipeline Runs"
        description="Each row is an ingestion attempt. Publication of a snapshot is confirmed on the control panel, not by the attempt alone."
        productionHref="/runs"
        actions={<Link className="pc-btn" href={href('/operations')}>Control panel</Link>}
      />
      {demo && (
        <StateBlock tone="partial" title="Demo layout does not include sample runs">
          Exit demo to load live run history. Starting a run from this preview uses the same API as production.
        </StateBlock>
      )}
      {runs.isLoading && <LoadingRows />}
      {runs.isError && <StateBlock tone="error" title="Runs could not be loaded">{errorText(runs.error)}</StateBlock>}
      {!demo && !runs.isLoading && !runs.isError && (
        <SortTable<RunSummary>
          caption="Pipeline runs"
          rows={rows}
          rowKey={(row) => row.run_id}
          empty={<StateBlock tone="empty" title="No pipeline runs yet" />}
          columns={[
            {
              id: 'run',
              header: 'Run',
              sticky: true,
              sortValue: (row) => row.started_at,
              cell: (row) => <Link href={href(`/operations/runs/${row.run_id}`)}>{row.run_id.slice(0, 8)}</Link>,
            },
            {
              id: 'status',
              header: 'Status',
              sortValue: (row) => row.status,
              cell: (row) => <StatusPill tone={tone(row.status)}>{row.status}</StatusPill>,
            },
            { id: 'started', header: 'Started', sortValue: (row) => row.started_at, cell: (row) => formatDate(row.started_at) },
            { id: 'finished', header: 'Finished', sortValue: (row) => row.finished_at, cell: (row) => formatDate(row.finished_at) },
            { id: 'notes', header: 'Notes', cell: (row) => row.notes || '—' },
          ]}
        />
      )}
    </div>
  );
}
