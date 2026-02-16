'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { getLatestFeeder } from '@/lib/api';
import { formatNumber } from '@/lib/format';
import EvidenceLink from './EvidenceLink';
import { EvidenceBadge, ConfidenceBadge } from './TrustBadges';

interface DrillThroughPanelProps {
  feederKey: number | null;
  onClose: () => void;
  /** Optional row for when feeder API not available */
  fallbackRow?: {
    feeder_name?: string;
    feeder_location?: string;
    min_supply_hours?: number | null;
    geocode_confidence?: number | null;
    source_pdf_url?: string | null;
    source_page_no?: number | null;
  } | null;
}

export default function DrillThroughPanel({ feederKey, onClose, fallbackRow }: DrillThroughPanelProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.feeder(feederKey ?? 0),
    queryFn: () => getLatestFeeder(feederKey!),
    enabled: feederKey != null && feederKey > 0,
  });

  const rows = data?.rows ?? [];
  const primary = rows[0] ?? fallbackRow;

  if (feederKey == null && !fallbackRow) return null;

  return (
    <div className="bg-white border-l border-[var(--ldv-border)] w-80 shrink-0 overflow-y-auto flex flex-col">
      <div className="p-3 border-b border-[var(--ldv-border)] flex justify-between items-center">
        <h3 className="font-semibold text-primary">Feeder detail</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-[var(--ldv-text-muted)] hover:text-primary p-1"
          aria-label="Close"
        >
          ×
        </button>
      </div>
      <div className="p-3 text-sm">
        {isLoading && <p className="text-[var(--ldv-text-muted)]">Loading…</p>}
        {error && <p className="text-red-600">Failed to load feeder.</p>}
        {!isLoading && !error && (primary || fallbackRow) && (
          <>
            <p><span className="text-[var(--ldv-text-muted)]">Feeder:</span> {primary?.feeder_name ?? fallbackRow?.feeder_name ?? '—'}</p>
            <p><span className="text-[var(--ldv-text-muted)]">Location:</span> {primary?.feeder_location ?? fallbackRow?.feeder_location ?? '—'}</p>
            <p><span className="text-[var(--ldv-text-muted)]">Min hours:</span> {formatNumber(primary?.min_supply_hours ?? fallbackRow?.min_supply_hours)}</p>
            <p>
              <span className="text-[var(--ldv-text-muted)]">Confidence:</span>{' '}
              <ConfidenceBadge value={(primary as { geocode_confidence?: number })?.geocode_confidence ?? fallbackRow?.geocode_confidence} />
            </p>
            <p className="mt-2">
              <span className="text-[var(--ldv-text-muted)]">Evidence:</span>{' '}
              <EvidenceBadge
                pdfUrl={fallbackRow?.source_pdf_url ?? (primary as { source_pdf_url?: string })?.source_pdf_url}
                pageNo={fallbackRow?.source_page_no ?? (primary as { source_page_no?: number })?.source_page_no}
              />{' '}
              <EvidenceLink
                pdfUrl={fallbackRow?.source_pdf_url ?? (primary as { source_pdf_url?: string })?.source_pdf_url}
                pageNo={fallbackRow?.source_page_no ?? (primary as { source_page_no?: number })?.source_page_no}
              />
            </p>
            {rows.length > 1 && (
              <div className="mt-3">
                <div className="font-medium text-[var(--ldv-text-muted)]">History ({rows.length} rows)</div>
                <ul className="list-disc pl-4 mt-1">
                  {rows.slice(0, 5).map((r, i) => (
                    <li key={i}>
                      {r.disco_code} · {r.band ?? '—'} · {formatNumber(r.min_supply_hours)}h
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
