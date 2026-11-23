'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ApiRequestError,
  checkHealthzWithUrl,
  createRun,
  getDetailedHealth,
  getDqIssues,
  getLayersBronzePdfs,
  getRuns,
  getSchedulerStatus,
  reconcileRuns,
} from '@/lib/api';
import { getRuntimeApiConfig } from '@/lib/apiBase';
import { queryKeys } from '@/lib/queryKeys';
import { useDQSummary, useMetricsGeocode, useMetricsPipeline } from '@/lib/hooks';
import { formatDate, formatNumber } from '@/lib/format';
import { errorText, isPublishedSnapshot, measurePct } from '../measure';
import { useCoverage, useDemo, useFreshness, usePreviewHref } from '../useConsoleData';
import { LoadingRows, PageHeader, StateBlock, StatusPill } from '../ui';

function runTone(status: string | undefined): 'ok' | 'warn' | 'danger' | 'neutral' {
  if (status === 'success') return 'ok';
  if (status === 'failed') return 'danger';
  if (status === 'running') return 'warn';
  return 'neutral';
}

export default function OperationsConsole() {
  const demo = useDemo();
  const href = usePreviewHref();
  const [notes, setNotes] = useState('');
  const qc = useQueryClient();
  const apiConfig = useMemo(() => getRuntimeApiConfig(), []);
  const freshness = useFreshness(demo);
  const coverage = useCoverage(demo);
  const published = isPublishedSnapshot(freshness.data);

  const health = useQuery({
    queryKey: ['healthz', apiConfig.healthzUrl],
    queryFn: () => checkHealthzWithUrl(apiConfig.healthzUrl),
    enabled: !demo,
    staleTime: 30 * 1000,
  });
  const detailed = useQuery({
    queryKey: ['health-detail', apiConfig.healthUrl],
    queryFn: () => getDetailedHealth(apiConfig.healthUrl),
    enabled: !demo && health.data?.ok === true,
  });
  const runs = useQuery({
    queryKey: queryKeys.runs(20, 0),
    queryFn: () => getRuns(20, 0),
    enabled: !demo,
    staleTime: 10 * 1000,
  });
  const scheduler = useQuery({
    queryKey: ['scheduler', 'status'],
    queryFn: getSchedulerStatus,
    enabled: !demo,
  });
  const sources = useQuery({
    queryKey: queryKeys.bronzePdfs(undefined, 20, 0),
    queryFn: () => getLayersBronzePdfs(undefined, 20, 0),
    enabled: !demo,
  });
  const dq = useDQSummary();
  const issues = useQuery({
    queryKey: queryKeys.dqIssues({ status: 'fail', limit: 20 }),
    queryFn: () => getDqIssues({ status: 'fail', limit: 20 }),
    enabled: !demo,
  });
  const geocode = useMetricsGeocode();
  const pipeline = useMetricsPipeline(10);

  const create = useMutation({
    mutationFn: () => createRun(notes || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['runs'] });
    },
  });
  const reconcile = useMutation({
    mutationFn: reconcileRuns,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['runs'] }),
  });

  const latestRun = demo ? null : (runs.data ?? []).find((run) => run?.run_id) ?? null;
  const activeRun = (runs.data ?? []).find((run) => run.status === 'running');
  const apiErr = create.error instanceof ApiRequestError ? create.error : null;
  const conflictId = (() => {
    if (apiErr?.status !== 409) return null;
    try {
      const body = JSON.parse(apiErr.responseBody) as { detail?: { run_id?: string } };
      return body.detail?.run_id ?? null;
    } catch {
      return null;
    }
  })();

  const sourceCount = Array.isArray(sources.data?.items) ? sources.data.items.length : null;
  const issueCount = issues.data?.issues?.length;

  return (
    <div>
      <PageHeader
        title="Operations Control Panel"
        description="The latest ingestion attempt and the latest published snapshot are separate. Actions use the same pipeline endpoints as Pipeline Operations."
        productionHref="/pipeline"
        actions={
          <>
            <Link className="pc-btn" href={href('/operations/runs')}>Pipeline runs</Link>
            <Link className="pc-btn" href={href('/operations/quality')}>Validation issues</Link>
            <Link className="pc-btn" href={href('/operations/geocoding')}>Geocoding exceptions</Link>
          </>
        }
      />

      <section className="pc-metrics">
        <article className="pc-metric">
          <p className="pc-metric-label">Latest ingestion attempt</p>
          {runs.isLoading && <p className="pc-metric-value">Loading…</p>}
          {runs.isError && <p className="pc-metric-value">Unavailable</p>}
          {!runs.isLoading && !latestRun && <p className="pc-metric-value">None</p>}
          {latestRun && (
            <>
              <p className="pc-metric-value" style={{ fontSize: 18 }}>{latestRun.status}</p>
              <p className="pc-metric-detail">
                Started {formatDate(latestRun.started_at)} · {String(latestRun.run_id).slice(0, 8)}
              </p>
              <StatusPill tone={runTone(latestRun.status)}>{latestRun.status}</StatusPill>
            </>
          )}
          {demo && <p className="pc-metric-detail">Demo layout does not invent a pipeline run.</p>}
        </article>
        <article className="pc-metric">
          <p className="pc-metric-label">Latest published snapshot</p>
          {freshness.isLoading && <p className="pc-metric-value">Loading…</p>}
          {freshness.isError && <p className="pc-metric-value">Unavailable</p>}
          {!freshness.isLoading && !published && <p className="pc-metric-value">Not published</p>}
          {published && (
            <>
              <p className="pc-metric-value" style={{ fontSize: 16 }}>{formatDate(freshness.data?.refreshed_at)}</p>
              <p className="pc-metric-detail">
                {freshness.data?.latest_run_id ? `Run ${String(freshness.data.latest_run_id).slice(0, 8)}` : 'Run id not provided'}
                {' · '}
                {freshness.data?.month_range || 'Reporting period not provided'}
              </p>
              <StatusPill tone="ok">Published</StatusPill>
            </>
          )}
        </article>
        <article className="pc-metric">
          <p className="pc-metric-label">Backend</p>
          {demo && <p className="pc-metric-value">Demo</p>}
          {!demo && health.isLoading && <p className="pc-metric-value">Checking…</p>}
          {!demo && health.data?.ok && (
            <p className="pc-metric-value" style={{ fontSize: 18 }}>
              {detailed.data?.status === 'degraded' ? 'Online, database degraded' : 'Online'}
            </p>
          )}
          {!demo && health.data && !health.data.ok && (
            <>
              <p className="pc-metric-value">Offline</p>
              <p className="pc-metric-detail">{health.data.error}</p>
            </>
          )}
        </article>
      </section>

      <div className="pc-flow" aria-label="Ingestion workflow">
        <article className="pc-step">
          <div className="pc-step-k">1 · Sources</div>
          <strong>{sources.isLoading ? 'Loading…' : sourceCount == null ? 'Unknown' : sourceCount === 0 ? 'No PDFs in this sample' : `${formatNumber(sourceCount)} PDFs in sample`}</strong>
          <p>Discovery registry. A sample of 20 is not the full corpus.</p>
        </article>
        <article className="pc-step">
          <div className="pc-step-k">2 · Runs</div>
          <strong>{latestRun ? latestRun.status : 'No attempt yet'}</strong>
          <p>{scheduler.data?.enabled ? 'Scheduler enabled' : 'Scheduler not enabled'}{scheduler.data?.next_run ? ` · next ${formatDate(scheduler.data.next_run)}` : ''}</p>
        </article>
        <article className="pc-step">
          <div className="pc-step-k">3 · Validation</div>
          <strong>
            {dq.isError
              ? 'Validation unavailable'
              : dq.isLoading
                ? 'Loading…'
                : dq.data?.total_records
                  ? `${formatNumber(dq.data.total_records)} records scored`
                  : 'No validation population'}
          </strong>
          <p>
            {issueCount == null ? 'Issues not loaded' : `${formatNumber(issueCount)} failing issues in this page`}
            {dq.data?.total_records ? ` · score ${measurePct(dq.data.dq_score, dq.data.total_records)}` : ''}
          </p>
        </article>
        <article className="pc-step">
          <div className="pc-step-k">4 · Publication</div>
          <strong>{published ? 'Snapshot published' : 'Not published'}</strong>
          <p>
            Geocoding {measurePct(geocode.data?.geocode_coverage_pct, geocode.data?.total_latest)}
            {coverage.data?.extraction_coverage_pct != null ? ` · evidence ${measurePct(coverage.data.extraction_coverage_pct, coverage.data.total_records)}` : ''}
          </p>
        </article>
      </div>

      {(pipeline.data?.stages?.length ?? 0) > 0 && (
        <section className="pc-card">
          <div className="pc-card-h"><h2>Recent stage metrics</h2></div>
          <div className="pc-card-b">
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {pipeline.data?.stages.slice(0, 8).map((stage) => (
                <li key={`${stage.run_id}-${stage.stage_name}`}>
                  {stage.stage_name} · {stage.status} · output {stage.output_count == null ? '—' : formatNumber(stage.output_count)} · errors {stage.error_count == null ? '—' : formatNumber(stage.error_count)}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="pc-card">
        <div className="pc-card-h">
          <h2>Operator actions</h2>
          <span className="pc-pill pc-pill-neutral">Same permission as Pipeline Operations</span>
        </div>
        <div className="pc-card-b">
          <p className="pc-gap">
            The current frontend does not add a separate admin flag for these actions. The API rejects a second run while one is active (HTTP 409). Scheduler secrets stay on the server. Admin overrides remain on the Admin screen.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <button
              type="button"
              className="pc-btn pc-btn-primary"
              disabled={demo || create.isPending}
              onClick={() => create.mutate()}
            >
              {create.isPending ? 'Starting…' : 'Run full pipeline'}
            </button>
            <button type="button" className="pc-btn" disabled={demo || reconcile.isPending} onClick={() => reconcile.mutate()}>
              {reconcile.isPending ? 'Reconciling…' : 'Reconcile stuck runs'}
            </button>
            <button type="button" className="pc-btn" disabled={!demo && health.isFetching} onClick={() => health.refetch()}>
              Test connection
            </button>
            {activeRun && (
              <Link className="pc-btn" href={href(`/operations/runs/${activeRun.run_id}`)}>View active run</Link>
            )}
            <button type="button" className="pc-btn" disabled title="The current API has no max-pages parameter. The production screen shows this control without a handler.">
              Run with max pages — not available
            </button>
          </div>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 12, fontSize: 12, fontWeight: 650, color: 'var(--pc-muted)' }}>
            Notes
            <input className="pc-field" value={notes} onChange={(event) => setNotes(event.target.value)} disabled={demo} placeholder="Optional note stored on the run" />
          </label>
          {demo && <p className="pc-gap">Pipeline actions are disabled while demo data is on, so a layout review cannot start an ingestion.</p>}
          {create.isSuccess && create.data?.run_id && (
            <p className="pc-gap">Run started. <Link href={href(`/operations/runs/${create.data.run_id}`)}>Open the run</Link></p>
          )}
          {conflictId && (
            <StateBlock tone="partial" title="A run is already in progress">
              <Link href={href(`/operations/runs/${conflictId}`)}>View that run</Link>
            </StateBlock>
          )}
          {create.isError && !conflictId && (
            <StateBlock tone="error" title="The pipeline did not start">{errorText(create.error)}</StateBlock>
          )}
          {reconcile.isError && (
            <StateBlock tone="error" title="Reconcile failed">{errorText(reconcile.error)}</StateBlock>
          )}
          <details style={{ marginTop: 12 }}>
            <summary>Connection diagnostics</summary>
            <p className="pc-gap">
              resolvedV1 {apiConfig.resolvedV1}<br />
              healthz {apiConfig.healthzUrl}
            </p>
          </details>
        </div>
      </section>
      {runs.isLoading && <LoadingRows />}
    </div>
  );
}
