'use client';

import { useState } from 'react';
import type { DqIssue } from '@/lib/types';
import { formatDate } from '@/lib/format';

interface DQIssuesTableProps {
  issues: DqIssue[];
}

export default function DQIssuesTable({ issues }: DQIssuesTableProps) {
  const [selected, setSelected] = useState<DqIssue | null>(null);

  if (!issues.length) {
    return (
      <p className="text-[var(--ldv-text-muted)] py-4">No failing records.</p>
    );
  }

  return (
    <>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Record ID</th>
              <th>Status</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {issues.map((i) => (
              <tr
                key={i.record_id}
                onClick={() => setSelected(i)}
                className="cursor-pointer"
              >
                <td className="font-mono text-xs">{i.record_id.slice(0, 50)}…</td>
                <td>
                  <span className="chip-failed">{i.dq_status}</span>
                </td>
                <td>{formatDate(i.created_at)}</td>
                <td>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected(i);
                    }}
                    className="text-support text-sm hover:underline"
                  >
                    Detail
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-4 border border-[var(--ldv-border)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-primary mb-2">Issue detail</h3>
            <p className="text-sm font-mono break-all text-[var(--ldv-text-muted)]">{selected.record_id}</p>
            <p className="text-sm mt-2"><span className="font-medium">Status:</span> {selected.dq_status}</p>
            <pre className="mt-2 p-2 bg-surface rounded text-xs overflow-auto max-h-48">
              {typeof selected.dq_reasons === 'object'
                ? JSON.stringify(selected.dq_reasons, null, 2)
                : String(selected.dq_reasons)}
            </pre>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="btn-secondary mt-4"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
