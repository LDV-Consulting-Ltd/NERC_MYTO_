'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRuns, createRun, getSchedulerStatus, reconcileRuns, checkHealthzWithUrl, getDetailedHealth, ApiRequestError } from '@/lib/api';
import { getRuntimeApiConfig } from '@/lib/apiBase';
import { queryKeys } from '@/lib/queryKeys';
import { formatDate } from '@/lib/format';

const DEBUG_BODY_MAX = 500;

export default function PipelinePage() {
  const [notes, setNotes] = useState('');
  const [lastDebug, setLastDebug] = useState<{
    timestamp: string;
    url: string;
    method: string;
    status: number;
    responseBody: string;
  } | null>(null);
  const [executeError, setExecuteError] = useState<string | null>(null);
  const [runInProgressId, setRunInProgressId] = useState<string | null>(null);
  const qc = useQueryClient();
  const reconcileMutation = useMutation({
    mutationFn: reconcileRuns,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.runs(20, 0) });
      if (data.count > 0) setExecuteError(null);
    },
  });

  const apiConfig = useMemo(() => getRuntimeApiConfig(), []);
  const { resolvedV1, healthzUrl, healthUrl } = apiConfig;

  const { data: health, isLoading: healthLoading, refetch: refetchHealth } = useQuery({
    queryKey: ['healthz', healthzUrl],
    queryFn: () => checkHealthzWithUrl(healthzUrl),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: detailedHealth } = useQuery({
    queryKey: ['health-detail', healthUrl],
    queryFn: () => getDetailedHealth(healthUrl),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
    enabled: health?.ok === true,
  });

  const { data: runsRaw, isLoading: runsLoading } = useQuery({
    queryKey: queryKeys.runs(20, 0),
    queryFn: () => getRuns(20, 0),
    staleTime: 10 * 1000,
  });
  const runs = Array.isArray(runsRaw) ? runsRaw : [];
  const activeRun = runs.find((r) => r && r.status === 'running');
  const { data: scheduler, isLoading: schedulerLoading } = useQuery({
    queryKey: ['scheduler', 'status'],
    queryFn: getSchedulerStatus,
    staleTime: 30 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: () => createRun(notes || undefined),
    onSuccess: (run) => {
      setLastDebug(null);
      setExecuteError(null);
      setRunInProgressId(null);
      qc.invalidateQueries({ queryKey: queryKeys.runs(20, 0) });
      qc.setQueryData(queryKeys.run(run.run_id), run);
      // Backend already starts the pipeline in the background when the run is created; do not call execute again.
    },
    onError: (error) => {
      if (error instanceof ApiRequestError) {
        setLastDebug({
          timestamp: new Date().toISOString(),
          url: error.url,
          method: error.method,
          status: error.status,
          responseBody: error.responseBody.slice(0, DEBUG_BODY_MAX),
        });
        if (error.status === 409) {
          try {
            const body = JSON.parse(error.responseBody) as { detail?: { run_id?: string } };
            setRunInProgressId(body.detail?.run_id ?? null);
          } catch {
            setRunInProgressId(null);
          }
        } else {
          setRunInProgressId(null);
        }
      } else {
        setLastDebug(null);
        setRunInProgressId(null);
      }
      setExecuteError(null);
    },
  });

  const lastRun = runs[0] && runs[0].run_id ? runs[0] : null;

  const handleRunFull = () => {
    setLastDebug(null);
    setExecuteError(null);
    createMutation.mutate(undefined);
  };

  const copyDebugInfo = () => {
    if (!lastDebug) return;
    const blob = [
      `timestamp: ${lastDebug.timestamp}`,
      `url: ${lastDebug.url}`,
      `method: ${lastDebug.method}`,
      `status: ${lastDebug.status}`,
      `responseBody: ${lastDebug.responseBody}`,
    ].join('\n');
    navigator.clipboard.writeText(blob);
  };

  const copyDiagnostics = () => {
    const timestamp = new Date().toISOString();
    const fetchError = health && !health.ok ? health.error : '';
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const blob = [
      `timestamp: ${timestamp}`,
      `resolvedV1: ${resolvedV1}`,
      `healthzUrl: ${healthzUrl}`,
      `healthUrl: ${healthUrl}`,
      `fetch error: ${fetchError}`,
      `userAgent: ${userAgent}`,
    ].join('\n');
    navigator.clipboard.writeText(blob);
  };

  const err = createMutation.error;
  const apiErr = err instanceof ApiRequestError ? err : null;
  const status = apiErr?.status ?? undefined;
  let statusMessage: string;
  try {
    statusMessage =
      status === 404
        ? 'Not Found (404). Backend may be offline or API base URL is wrong.'
        : status === 401 || status === 403
          ? 'Unauthorized. Check auth or API key (if enabled).'
          : status === 422
            ? 'Validation error. Check request body.'
            : status === 500
              ? 'Backend error. Check backend logs.'
              : apiErr
                ? `${apiErr.message} (${status})`
                : err instanceof Error
                  ? err.message
                  : String(err ?? 'Unknown error');
  } catch {
    statusMessage = 'An error occurred. Check the browser console.';
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--ldv-primary)] tracking-tight mb-2">Pipeline Operations</h1>
      <p className="text-sm text-[var(--ldv-text-muted)] mb-4">
        Start a full pipeline run. View run details and logs from Runs.
      </p>

      {/* Backend health — dynamic, runtime-resolved */}
      <div className="mb-4 rounded-lg border border-[var(--ldv-border)] bg-[var(--ldv-surface)]/30 p-3">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <span className="text-sm font-medium text-[var(--ldv-text-muted)]">Backend:</span>
          {healthLoading ? (
            <span className="text-sm text-[var(--ldv-text-muted)]">Checking…</span>
          ) : health?.ok ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              {detailedHealth?.status === 'degraded' ? 'Online (DB degraded)' : 'Online'}
            </span>
          ) : (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 text-red-800 text-xs font-semibold px-2.5 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600" /> Offline
              </span>
              {health && !health.ok && (
                <span className="text-xs text-red-700" title="Exact error from fetch">
                  {health.error}
                </span>
              )}
            </>
          )}
          <button type="button" className="btn-secondary text-sm py-1.5" onClick={() => refetchHealth()}>
            Test connection
          </button>
          <button type="button" className="btn-secondary text-sm py-1.5" onClick={copyDiagnostics}>
            Copy diagnostics
          </button>
          <a
            href={apiConfig.healthzUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-sm py-1.5 inline-block"
            title="Open in new tab; check Network tab for x-proxy-target header"
          >
            Verify proxy (open healthz)
          </a>
        </div>
        <div className="text-xs text-[var(--ldv-text-muted)] font-mono space-y-0.5 mt-2">
          <div>env NEXT_PUBLIC_API_BASE_URL (raw): <code className="bg-white/80 px-1 rounded">{apiConfig.envRaw}</code></div>
          <div>resolvedBase: <code className="bg-white/80 px-1 rounded break-all">{apiConfig.resolvedBase}</code></div>
          <div>resolvedV1: <code className="bg-white/80 px-1 rounded break-all">{apiConfig.resolvedV1}</code></div>
          <div>healthzUrl: <code className="bg-white/80 px-1 rounded break-all">{apiConfig.healthzUrl}</code></div>
          <div>healthUrl: <code className="bg-white/80 px-1 rounded break-all">{apiConfig.healthUrl}</code></div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <div className="kpi-card p-4">
          <h2 className="font-semibold text-[var(--ldv-primary)] mb-3">Scheduler status</h2>
          {schedulerLoading && <p className="text-sm text-[var(--ldv-text-muted)]">Loading…</p>}
          {!schedulerLoading && (
            <ul className="text-sm space-y-1">
              <li>Enabled: {scheduler?.enabled ? 'Yes' : 'No'}</li>
              <li>Next run: {scheduler?.next_run ? formatDate(scheduler.next_run) : '—'}</li>
              <li>Last run: {scheduler?.last_run ? formatDate(scheduler.last_run) : '—'}</li>
            </ul>
          )}
        </div>
        <div className="kpi-card p-4">
          <h2 className="font-semibold text-[var(--ldv-primary)] mb-3">Last run summary</h2>
          {runsLoading && <p className="text-sm text-[var(--ldv-text-muted)]">Loading…</p>}
          {!runsLoading && lastRun && lastRun.run_id && (
            <div className="text-sm space-y-1">
              <p>Run {String(lastRun.run_id).slice(0, 8)}… · {lastRun.status ?? '—'}</p>
              <p className="text-[var(--ldv-text-muted)]">Started {formatDate(lastRun.started_at)}</p>
              <Link
                href={`/runs/${lastRun.run_id}`}
                className="text-[var(--ldv-support)] hover:underline inline-block mt-2"
              >
                View run details →
              </Link>
            </div>
          )}
          {!runsLoading && !lastRun && (
            <p className="text-[var(--ldv-text-muted)]">No runs yet — run pipeline.</p>
          )}
        </div>
      </div>

      <div className="border border-[var(--ldv-border)] rounded-lg p-4 bg-[var(--ldv-surface)]/50 max-w-xl">
        <h2 className="font-semibold text-[var(--ldv-primary)] mb-3">Actions</h2>
        <div className="flex flex-wrap gap-3 items-center">
          <button
            type="button"
            className="btn-primary"
            disabled={createMutation.isPending}
            onClick={handleRunFull}
          >
            {createMutation.isPending ? 'Starting…' : 'Run Full Pipeline'}
          </button>
          {activeRun?.run_id ? (
            <Link
              href={`/runs/${activeRun.run_id}`}
              className="btn-secondary inline-block"
            >
              Resume viewing active run
            </Link>
          ) : null}
          <button
            type="button"
            className="btn-secondary"
            disabled={reconcileMutation.isPending}
            title="Mark runs stuck in 'running' (e.g. heartbeat stale 10+ min) as failed"
            onClick={() => reconcileMutation.mutate()}
          >
            {reconcileMutation.isPending ? 'Reconciling…' : 'Reconcile stuck runs'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={createMutation.isPending}
            title="Optional: run with max pages limit"
          >
            Run with max pages (TODO)
          </button>
        </div>
        {runInProgressId && createMutation.isError && (createMutation.error as ApiRequestError)?.status === 409 && (
          <div className="mt-3 text-sm text-amber-700 rounded border border-amber-200 bg-amber-50 p-3">
            <p className="font-medium">Run already in progress</p>
            <p className="mt-1 text-amber-800">
              A run is already running. View its progress or wait for it to finish.
            </p>
            <Link
              href={`/runs/${runInProgressId}`}
              className="inline-block mt-2 text-[var(--ldv-support)] hover:underline font-medium"
            >
              View progress →
            </Link>
          </div>
        )}
        <label className="block mt-3 text-sm text-[var(--ldv-text-muted)]">
          Notes (optional)
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. manual run"
            className="ml-2 border border-[var(--ldv-border)] rounded px-2 py-1 w-48"
          />
        </label>
        {createMutation.isSuccess && createMutation.data?.run_id && (
          <p className="mt-3 text-sm text-emerald-700">
            Run started.{' '}
            <Link href={`/runs/${createMutation.data.run_id}`} className="text-[var(--ldv-support)] hover:underline">
              View run details →
            </Link>
          </p>
        )}
        {executeError && (
          <div className="mt-3 text-sm text-amber-700">
            <p className="font-medium">Run created but execution failed.</p>
            <p className="mt-1">{executeError}</p>
            {lastDebug && (
              <div className="mt-2">
                <button type="button" className="btn-secondary text-xs py-1" onClick={copyDebugInfo}>
                  Copy debug info
                </button>
              </div>
            )}
          </div>
        )}
        {createMutation.isError && (
          <div className="mt-3 text-sm text-red-600">
            <p className="font-medium">Failed to start run.</p>
            <p className="mt-1 text-red-700">{statusMessage}</p>
            {status === 404 && (
              <p className="mt-2 text-[var(--ldv-text-muted)]">
                Attempted URL: <code className="block mt-0.5 break-all bg-red-50 px-1 rounded">{apiErr?.url ?? '—'}</code>
                Start backend with <code className="bg-[var(--ldv-surface)] px-1 rounded">uvicorn app.main:app --reload --host 0.0.0.0 --port 8000</code> and confirm port.
              </p>
            )}
            {lastDebug && (
              <div className="mt-2">
                <button
                  type="button"
                  className="btn-secondary text-xs py-1"
                  onClick={copyDebugInfo}
                >
                  Copy debug info
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
