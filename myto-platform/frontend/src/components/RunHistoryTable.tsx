'use client';

import Link from 'next/link';
import type { RunSummary } from '@/lib/types';
import { formatDate } from '@/lib/format';

interface RunHistoryTableProps {
  runs: RunSummary[];
  limit?: number;
  showViewAll?: boolean;
}

export default function RunHistoryTable({ runs, limit = 10, showViewAll = true }: RunHistoryTableProps) {
  const list = runs.slice(0, limit);

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>Run</th>
            <th>Status</th>
            <th>Started</th>
            <th>Finished</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {list.map((r) => (
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
              <td>
                <Link href={`/runs/${r.run_id}`} className="text-support hover:underline text-sm">
                  Detail
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {showViewAll && runs.length > 0 && (
        <p className="px-3 py-2 text-sm text-[var(--ldv-text-muted)]">
          <Link href="/runs" className="text-support hover:underline">
            View all runs →
          </Link>
        </p>
      )}
    </div>
  );
}
