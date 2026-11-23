'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useDQIssues, useRun, useRunEvents } from '@/lib/hooks';
import { getRunSnapshot } from '@/lib/api';
import StageDAG from '@/components/StageDAG';
import LogViewer from '@/components/LogViewer';
import DQIssuesTable from '@/components/DQIssuesTable';
import { formatDate, formatNumber } from '@/lib/format';
import { errorText } from '../measure';
import { usePreviewHref } from '../useConsoleData';
import { LoadingRows, MetricTile, PageHeader, StateBlock, StatusPill } from '../ui';

export default function RunDetail() {
  const params = useParams();
  const pathname = usePathname() ?? '';
  const fromParams = (params?.run_id as string) || (params?.runId as string) || '';
  const fromPath = pathname.match(/\/runs\/([^/]+)$/)?.[1] ?? '';
  const runId = decodeURIComponent(fromParams || fromPath);
  const href = usePreviewHref();
  const [poll, setPoll] = useState(false);
  const [tab, setTab] = useState<'logs' | 'validation' | 'snapshot'>('logs');
  const run = useRun(runId, poll);
  const events = useRunEvents(runId, 500, 0, poll);
  const issues = useDQIssues({ run_id: runId, status: 'fail', limit: 200 });
  const snapshot = useQuery({
    queryKey: ['run-snapshot', runId],
    queryFn: () => getRunSnapshot(runId),
    enabled: Boolean(runId) && run.data?.status !== 'running',
  });

  useEffect(() => {
    setPoll(run.data?.status === 'running');
  }, [run.data?.status]);

  if (!runId) return <StateBlock tone="error" title="Missing run id" />;
  if (run.isLoading) return <LoadingRows />;
  if (run.isError || !run.data) {
    return <StateBlock tone="error" title="Run not found">{errorText(run.error)}</StateBlock>;
  }

  const detail = run.data;
  const duration =
    detail.finished_at && detail.started_at
      ? Math.round((new Date(detail.finished_at).getTime() - new Date(detail.started_at).getTime()) / 1000)
      : null;

  return (
    <div>
      <PageHeader
        title={`Run ${runId.slice(0, 8)}`}
        description={detail.notes || 'Ingestion attempt. A finished run is not the same thing as the published snapshot.'}
        productionHref={`/runs/${runId}`}
        actions={
          <>
            <StatusPill tone={detail.status === 'success' ? 'ok' : detail.status === 'failed' ? 'danger' : 'warn'}>
              {detail.status}
            </StatusPill>
            <Link className="pc-btn" href={href('/operations/runs')}>All runs</Link>
          </>
        }
      />
      <section className="pc-metrics">
        <MetricTile label="Started" value={formatDate(detail.started_at)} />
        <MetricTile label="Finished" value={formatDate(detail.finished_at)} />
        <MetricTile label="Duration" value={duration == null ? '—' : `${formatNumber(duration)} s`} />
      </section>
      <section className="pc-card">
        <div className="pc-card-h"><h2>Stages</h2></div>
        <div className="pc-card-b">
          <StageDAG stages={detail.stages ?? []} />
        </div>
      </section>
      <div className="pc-toolbar" role="tablist" aria-label="Run detail sections">
        {([
          ['logs', 'Logs'],
          ['validation', 'Validation issues'],
          ['snapshot', 'Stage counts'],
        ] as const).map(([id, label]) => (
          <button key={id} type="button" className="pc-btn" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'logs' && <LogViewer events={events.data?.events ?? []} />}
      {tab === 'validation' && (
        issues.isLoading ? <LoadingRows /> : <DQIssuesTable issues={issues.data?.issues ?? []} />
      )}
      {tab === 'snapshot' && (
        snapshot.isLoading ? <LoadingRows /> : snapshot.isError ? (
          <StateBlock tone="error" title="Run snapshot could not be loaded">{errorText(snapshot.error)}</StateBlock>
        ) : (
          <section className="pc-metrics">
            <MetricTile label="PDFs" value={formatNumber(snapshot.data?.pdfs?.length ?? 0)} detail="Count of returned PDF rows" />
            <MetricTile label="Silver commitments" value={snapshot.data?.silver_commitments_count == null ? '—' : formatNumber(snapshot.data.silver_commitments_count)} />
            <MetricTile label="Gold facts" value={snapshot.data?.gold_facts_count == null ? '—' : formatNumber(snapshot.data.gold_facts_count)} />
          </section>
        )
      )}
    </div>
  );
}
