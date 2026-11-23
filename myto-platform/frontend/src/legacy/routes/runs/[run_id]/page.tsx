'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRun, useRunEvents, useDQIssues } from '@/lib/hooks';
import StageDAG from '@/components/StageDAG';
import LogViewer from '@/components/LogViewer';
import DQIssuesTable from '@/components/DQIssuesTable';
import { formatDate } from '@/lib/format';
import { getRunSnapshot } from '@/lib/api';

type TabId = 'logs' | 'dq';

export default function RunDetailPage() {
  const params = useParams();
  const runId = (params?.run_id as string) ?? '';
  const [activeTab, setActiveTab] = useState<TabId>('logs');
  const [logStageFilter, setLogStageFilter] = useState('');
  const [pollWhenRunning, setPollWhenRunning] = useState(false);

  const { data: run, isLoading, error } = useRun(runId, pollWhenRunning);
  const { data: eventsData } = useRunEvents(runId, 500, 0, pollWhenRunning);

  useEffect(() => {
    setPollWhenRunning(run?.status === 'running' ?? false);
  }, [run?.status]);

  const { data: dqData } = useDQIssues({ run_id: runId, status: 'fail', limit: 200 });

  const { data: snapshot } = useQuery({
    queryKey: ['run-snapshot', runId],
    queryFn: () => getRunSnapshot(runId),
    enabled: !!runId && run?.status !== 'running',
  });

  const events = eventsData?.events ?? [];
  const filteredEvents = logStageFilter ? events.filter((e) => e.stage_name === logStageFilter) : events;
  const stageNames = [...new Set(events.map((e) => e.stage_name))].sort();

  if (!runId) return <p className="text-[var(--ldv-text-muted)]">Missing run ID.</p>;
  if (error || (!isLoading && !run)) return <p className="text-red-600">Run not found.</p>;
  if (isLoading || !run) return <p className="text-[var(--ldv-text-muted)]">Loading…</p>;

  const duration =
    run.finished_at && run.started_at
      ? Math.round(
          (new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()) / 1000
        )
      : null;

  return (
    <div>
      <div className="mb-4">
        <Link href="/runs" className="text-support text-sm hover:underline">← Runs</Link>
        <h1 className="text-xl font-semibold text-primary mt-1">
          Run {runId.slice(0, 8)}…
          <span
            className={`ml-2 ${
              run.status === 'success'
                ? 'chip-success'
                : run.status === 'failed'
                  ? 'chip-failed'
                  : 'chip-running'
            }`}
          >
            {run.status}
          </span>
        </h1>
      </div>
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="kpi-card p-3">
          <div className="text-xs text-[var(--ldv-text-muted)]">Started</div>
          <div className="text-sm font-semibold">{formatDate(run.started_at)}</div>
        </div>
        <div className="kpi-card p-3">
          <div className="text-xs text-[var(--ldv-text-muted)]">Finished</div>
          <div className="text-sm font-semibold">{formatDate(run.finished_at)}</div>
        </div>
        <div className="kpi-card p-3">
          <div className="text-xs text-[var(--ldv-text-muted)]">Duration</div>
          <div className="text-sm font-semibold">{duration != null ? `${duration}s` : '—'}</div>
        </div>
        <div className="kpi-card p-3">
          <div className="text-xs text-[var(--ldv-text-muted)]">Stages</div>
          <div className="text-sm font-semibold">{run.stages?.length ?? 0}</div>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-primary mb-2">Stage DAG</h2>
      <p className="text-xs text-[var(--ldv-text-muted)] mb-2">
        One continuous flow: Bronze (discover → download → extract) → Silver (transform → geocode) → Gold (build) → Promote. No manual step between layers.
      </p>
      <StageDAG stages={run.stages ?? []} />

      <div className="flex gap-2 mt-4 border-b border-[var(--ldv-border)]">
        {(['logs', 'dq'] as TabId[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 text-sm font-medium ${
              activeTab === tab
                ? 'border-b-2 border-primary text-primary -mb-px'
                : 'text-[var(--ldv-text-muted)] hover:text-primary'
            }`}
          >
            {tab === 'logs' ? 'Logs' : 'DQ issues'}
          </button>
        ))}
      </div>

      {activeTab === 'logs' && (
        <div className="mt-4">
          <label className="text-sm mr-2">Stage:</label>
          <select
            value={logStageFilter}
            onChange={(e) => setLogStageFilter(e.target.value)}
            className="border border-[var(--ldv-border)] rounded px-2 py-1 text-sm"
          >
            <option value="">All</option>
            {stageNames.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <div className="mt-2">
            <LogViewer events={filteredEvents} />
          </div>
        </div>
      )}
      {activeTab === 'dq' && (
        <div className="mt-4">
          <DQIssuesTable issues={dqData?.issues ?? []} />
        </div>
      )}

      {/* Tables & data snapshot */}
      {snapshot && (
        <div className="mt-6 border border-[var(--ldv-border)] rounded-lg overflow-hidden">
          <h2 className="text-lg font-semibold text-primary px-4 py-3 border-b border-[var(--ldv-border)] bg-[var(--ldv-surface)]/50">
            Tables & data snapshot
          </h2>
          <div className="p-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-3 text-sm">
              <div>
                <span className="text-[var(--ldv-text-muted)]">PDFs discovered</span>
                <p className="font-semibold">{snapshot.pdfs?.length ?? 0}</p>
                {snapshot.pdfs?.length ? (
                  <ul className="mt-1 text-xs space-y-0.5 max-h-24 overflow-auto">
                    {(snapshot.pdfs.slice(0, 8)).map((p, i) => (
                      <li key={i} className="truncate" title={p.pdf_url}>
                        {p.pdf_filename || p.title || p.pdf_url?.split('/').pop() || '—'}
                      </li>
                    ))}
                    {snapshot.pdfs.length > 8 && <li className="text-[var(--ldv-text-muted)]">+{snapshot.pdfs.length - 8} more</li>}
                  </ul>
                ) : null}
              </div>
              <div>
                <span className="text-[var(--ldv-text-muted)]">Artifacts downloaded</span>
                <p className="font-semibold">{snapshot.artifacts_count ?? 0}</p>
              </div>
              <div>
                <span className="text-[var(--ldv-text-muted)]">Tables extracted</span>
                <p className="font-semibold">{snapshot.tables_count ?? 0}</p>
                {snapshot.silver_commitments_count != null && (
                  <>
                    <span className="text-[var(--ldv-text-muted)] block mt-2">Silver commitments</span>
                    <p className="font-semibold">{snapshot.silver_commitments_count}</p>
                  </>
                )}
                {snapshot.gold_facts_count != null && (
                  <>
                    <span className="text-[var(--ldv-text-muted)] block mt-2">Gold facts</span>
                    <p className="font-semibold">{snapshot.gold_facts_count}</p>
                  </>
                )}
              </div>
            </div>
            {snapshot.table_samples?.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-primary mb-2">Sample extracted rows (Bronze)</h3>
                <div className="space-y-3">
                  {snapshot.table_samples.map((t, i) => (
                    <div key={i} className="border border-[var(--ldv-border)] rounded p-2 bg-white text-xs overflow-x-auto">
                      <p className="font-mono text-[var(--ldv-text-muted)] mb-1">{t.table_name} · page {t.page_no} · {t.row_count} rows · {t.method || '—'}</p>
                      {t.sample_rows?.length ? (
                        <pre className="whitespace-pre-wrap break-all">{JSON.stringify(t.sample_rows, null, 2)}</pre>
                      ) : (
                        <p className="text-[var(--ldv-text-muted)]">No sample</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {snapshot.silver_sample?.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-primary mb-2">Sample Silver commitments</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--ldv-border)]">
                        <th className="text-left py-1 pr-2">DisCo</th>
                        <th className="text-left py-1 pr-2">Month / Year</th>
                        <th className="text-left py-1 pr-2">Feeder</th>
                        <th className="text-left py-1 pr-2">Location</th>
                        <th className="text-left py-1 pr-2">Min hrs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshot.silver_sample.map((r, i) => (
                        <tr key={i} className="border-b border-[var(--ldv-border)]/50">
                          <td className="py-1 pr-2">{r.disco_code}</td>
                          <td className="py-1 pr-2">{r.month_name} / {r.year}</td>
                          <td className="py-1 pr-2 max-w-[120px] truncate">{r.feeder_name ?? '—'}</td>
                          <td className="py-1 pr-2 max-w-[120px] truncate">{r.feeder_location ?? '—'}</td>
                          <td className="py-1 pr-2">{r.min_supply_hours ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {(snapshot.gold_facts_count != null && snapshot.gold_facts_count > 0) || (snapshot.gold_sample?.length ?? 0) > 0 ? (
              <div>
                <h3 className="text-sm font-medium text-primary mb-2">Sample Gold facts (fact_supply_commitment)</h3>
                <p className="text-xs text-[var(--ldv-text-muted)] mb-1">Total facts for this run: {snapshot.gold_facts_count ?? 0}</p>
                {snapshot.gold_sample?.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--ldv-border)]">
                          <th className="text-left py-1 pr-2">DisCo</th>
                          <th className="text-left py-1 pr-2">Date key</th>
                          <th className="text-left py-1 pr-2">Feeder</th>
                          <th className="text-left py-1 pr-2">Band</th>
                          <th className="text-left py-1 pr-2">Min hrs</th>
                        </tr>
                      </thead>
                      <tbody>
                        {snapshot.gold_sample.map((r, i) => (
                          <tr key={i} className="border-b border-[var(--ldv-border)]/50">
                            <td className="py-1 pr-2">{r.disco_code}</td>
                            <td className="py-1 pr-2">{r.date_key}</td>
                            <td className="py-1 pr-2 max-w-[120px] truncate">{r.feeder_name ?? '—'}</td>
                            <td className="py-1 pr-2">{r.band ?? '—'}</td>
                            <td className="py-1 pr-2">{r.min_supply_hours ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-[var(--ldv-text-muted)]">No fact rows for this run yet.</p>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      <p className="mt-4 text-sm text-[var(--ldv-text-muted)]">
        Artifacts and raw tables: <Link href="/layers/bronze" className="text-support hover:underline">Bronze</Link> ·{' '}
        <Link href="/layers/silver" className="text-support hover:underline">Silver</Link> ·{' '}
        <Link href="/layers/gold" className="text-support hover:underline">Gold</Link>
      </p>
    </div>
  );
}
