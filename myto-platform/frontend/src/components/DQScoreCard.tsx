'use client';

import { formatPct } from '@/lib/format';
import Link from 'next/link';

interface DQScoreCardProps {
  dqScore: number | null | undefined;
  totalRecords?: number | null;
  runId?: string | null;
}

export default function DQScoreCard({ dqScore, totalRecords, runId }: DQScoreCardProps) {
  const score = dqScore != null ? Number(dqScore) : null;
  const pct = score != null ? formatPct(score, 0) : '—';

  return (
    <div className="kpi-card p-4">
      <div className="text-xs font-medium text-[var(--ldv-text-muted)]">DQ Score</div>
      <div className="text-2xl font-bold text-primary mt-1">{pct}</div>
      {totalRecords != null && (
        <div className="text-xs text-[var(--ldv-text-muted)] mt-1">
          {totalRecords.toLocaleString()} records
        </div>
      )}
      <Link
        href="/dq"
        className="text-sm text-support hover:underline mt-2 inline-block"
      >
        View issues →
      </Link>
    </div>
  );
}
