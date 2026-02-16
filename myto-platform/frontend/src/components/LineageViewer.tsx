'use client';

import type { LineagePath } from '@/lib/types';

interface LineageViewerProps {
  paths: LineagePath[];
}

export default function LineageViewer({ paths }: LineageViewerProps) {
  if (!paths.length) {
    return (
      <p className="text-[var(--ldv-text-muted)] py-4">No lineage data.</p>
    );
  }

  return (
    <div className="space-y-4">
      {paths.map((p, i) => (
        <div
          key={i}
          className="border border-[var(--ldv-border)] rounded-lg p-3 bg-surface/50"
        >
          <div className="font-medium text-primary mb-2">{p.metric ?? 'Path'}</div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-mono text-support bg-white px-2 py-0.5 rounded border border-[var(--ldv-border)]">
              Gold: {p.gold}
            </span>
            <span className="text-[var(--ldv-text-muted)]">→</span>
            <span className="font-mono text-support bg-white px-2 py-0.5 rounded border border-[var(--ldv-border)]">
              Silver: {p.silver}
            </span>
            <span className="text-[var(--ldv-text-muted)]">→</span>
            <span className="font-mono text-support bg-white px-2 py-0.5 rounded border border-[var(--ldv-border)]">
              Bronze: {p.bronze}
            </span>
            <span className="text-[var(--ldv-text-muted)]">→</span>
            <span className="font-mono text-[var(--ldv-text-muted)] bg-white px-2 py-0.5 rounded border border-[var(--ldv-border)]">
              Source: {p.source}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
