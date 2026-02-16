'use client';

import type { RunEvent } from '@/lib/types';

interface LogViewerProps {
  events: RunEvent[];
}

export default function LogViewer({ events }: LogViewerProps) {
  if (!events.length) {
    return (
      <p className="text-[var(--ldv-text-muted)] py-4">No events.</p>
    );
  }

  return (
    <pre className="bg-[var(--ldv-primary)] text-white p-4 rounded-lg overflow-auto max-h-[400px] text-sm font-mono">
      {events.map((e, i) => (
        <div
          key={i}
          className={
            e.level === 'error'
              ? 'text-red-400'
              : e.level === 'warning'
                ? 'text-amber-300'
                : 'text-gray-300'
          }
        >
          [{e.stage_name}] {e.level}: {e.message ?? ''}
        </div>
      ))}
    </pre>
  );
}
