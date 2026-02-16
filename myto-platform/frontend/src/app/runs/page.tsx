'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRuns } from '@/lib/hooks';
import RunHistoryTable from '@/components/RunHistoryTable';
import { formatDate } from '@/lib/format';

function duration(r: { started_at: string; finished_at: string | null }) {
  if (!r.finished_at || !r.started_at) return '—';
  const ms = new Date(r.finished_at).getTime() - new Date(r.started_at).getTime();
  return `${Math.round(ms / 1000)}s`;
}

export default function RunsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { data: runs = [], isLoading } = useRuns(100, 0);

  const filtered = statusFilter === 'all' ? runs : runs.filter((r) => r.status === statusFilter);

  return (
    <div>
      <h1 className="text-xl font-semibold text-primary mb-2">Pipeline Runs</h1>
      <p className="text-sm text-[var(--ldv-text-muted)] mb-4">
        Run history. Filters by status. View run details for stage DAG and logs.
      </p>
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <label className="flex items-center gap-2 text-sm">
          Status
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-[var(--ldv-border)] rounded px-2 py-1.5 text-sm"
          >
            <option value="all">All</option>
            <option value="running">Running</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
          </select>
        </label>
        <Link href="/pipeline" className="btn-primary">Run Pipeline</Link>
      </div>
      {isLoading && <p className="text-[var(--ldv-text-muted)]">Loading…</p>}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Run</th>
              <th>Status</th>
              <th>Started</th>
              <th>Finished</th>
              <th>Duration</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.run_id}>
                <td className="font-mono text-xs">{r.run_id.slice(0, 8)}…</td>
                <td>
                  <span
                    className={
                      r.status === 'success'
                        ? 'chip-success'
                        : r.status === 'failed'
                          ? 'chip-failed'
                          : 'chip-running'
                    }
                  >
                    {r.status}
                  </span>
                </td>
                <td>{formatDate(r.started_at)}</td>
                <td>{formatDate(r.finished_at)}</td>
                <td>{duration(r)}</td>
                <td>
                  <Link href={`/runs/${r.run_id}`} className="text-support hover:underline text-sm">
                    Detail
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
