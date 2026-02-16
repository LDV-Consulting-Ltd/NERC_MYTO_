'use client';

/** Badge: has source PDF + page (evidence) */
export function EvidenceBadge({
  pdfUrl,
  pageNo,
  size = 'sm',
}: {
  pdfUrl?: string | null;
  pageNo?: number | null;
  size?: 'sm' | 'xs';
}) {
  const hasEvidence = !!(pdfUrl || (pageNo != null && pageNo > 0));
  const cls = size === 'xs' ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5';
  if (!hasEvidence) {
    return (
      <span className={`inline-flex items-center rounded font-medium bg-[var(--ldv-border)]/60 text-[var(--ldv-text-muted)] ${cls}`}>
        No source
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center rounded font-medium bg-[var(--ldv-accent)]/15 text-[var(--ldv-primary)] border border-[var(--ldv-accent)]/40 ${cls}`} title="Source PDF + page">
      {pageNo != null ? `p.${pageNo}` : 'PDF'}
    </span>
  );
}

/** Badge: geocode confidence (high / medium / low) */
export function ConfidenceBadge({ value }: { value?: number | null }) {
  if (value == null || Number.isNaN(value)) {
    return (
      <span className="inline-flex items-center rounded text-xs px-2 py-0.5 font-medium bg-[var(--ldv-border)]/60 text-[var(--ldv-text-muted)]">
        —
      </span>
    );
  }
  const pct = Math.round(value * 100);
  const level = pct >= 70 ? 'High' : pct >= 40 ? 'Medium' : 'Low';
  const bg =
    level === 'High'
      ? 'bg-emerald-100 text-emerald-800'
      : level === 'Medium'
        ? 'bg-amber-100 text-amber-800'
        : 'bg-red-50 text-red-700';
  return (
    <span className={`inline-flex items-center rounded text-xs px-2 py-0.5 font-medium ${bg}`} title={`${pct}%`}>
      {level}
    </span>
  );
}

/** Badge: freshness (e.g. "Updated 2h ago") */
export function FreshnessBadge({ iso }: { iso?: string | null }) {
  if (!iso) {
    return (
      <span className="inline-flex items-center rounded text-xs px-2 py-0.5 font-medium bg-[var(--ldv-border)]/60 text-[var(--ldv-text-muted)]">
        —
      </span>
    );
  }
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffM = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMs / 3600000);
    const diffD = Math.floor(diffMs / 86400000);
    let label = '—';
    if (diffM < 1) label = 'Just now';
    else if (diffM < 60) label = `${diffM}m ago`;
    else if (diffH < 24) label = `${diffH}h ago`;
    else if (diffD < 7) label = `${diffD}d ago`;
    else label = d.toLocaleDateString();
    return (
      <span className="inline-flex items-center rounded text-xs px-2 py-0.5 font-medium bg-[var(--ldv-surface)] text-[var(--ldv-text-primary)] border border-[var(--ldv-border)]" title={iso}>
        {label}
      </span>
    );
  } catch {
    return (
      <span className="inline-flex items-center rounded text-xs px-2 py-0.5 font-medium bg-[var(--ldv-border)]/60 text-[var(--ldv-text-muted)]">
        —
      </span>
    );
  }
}
