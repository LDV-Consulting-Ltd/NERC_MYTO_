export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return String(iso);
  }
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffM = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMs / 3600000);
    const diffD = Math.floor(diffMs / 86400000);
    if (diffM < 1) return 'just now';
    if (diffM < 60) return `${diffM}m ago`;
    if (diffH < 24) return `${diffH}h ago`;
    if (diffD < 7) return `${diffD}d ago`;
    return formatDate(iso);
  } catch {
    return String(iso);
  }
}

export function formatPct(value: number | null | undefined, decimals = 1): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${Number(value).toFixed(decimals)}%`;
}

export function formatNumber(n: number | null | undefined, decimals = 0): string {
  if (n == null || Number.isNaN(n)) return '—';
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: decimals });
}

export function formatConfidence(c: number | null | undefined): string {
  if (c == null || Number.isNaN(c)) return '—';
  const pct = Math.round(c * 100);
  return pct >= 70 ? `High (${pct}%)` : pct >= 40 ? `Medium (${pct}%)` : `Low (${pct}%)`;
}
