'use client';

import type { StageInfo } from '@/lib/types';
import { formatNumber } from '@/lib/format';

const ORDER = ['discover', 'download', 'extract', 'silver_transform', 'silver_geocode', 'gold_build', 'promote_latest'];

interface StageDAGProps {
  stages: StageInfo[];
}

export default function StageDAG({ stages }: StageDAGProps) {
  const sorted = [...stages].sort(
    (a, b) => ORDER.indexOf(a.stage_name) - ORDER.indexOf(b.stage_name)
  );

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {sorted.map((s) => (
        <div
          key={s.stage_name}
          className={`px-3 py-2 rounded-lg border ${
            s.status === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : s.status === 'failed'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-surface border-[var(--ldv-border)] text-primary'
          }`}
        >
          <div className="font-semibold text-sm">{s.stage_name}</div>
          <div className="text-xs text-[var(--ldv-text-muted)]">
            {s.output_count != null && `out: ${formatNumber(s.output_count)}`}
            {s.duration_ms != null && ` · ${formatNumber(s.duration_ms)} ms`}
          </div>
        </div>
      ))}
    </div>
  );
}
