'use client';

import { useSnapshotMeta } from '@/lib/hooks';
import { formatDate, formatPct } from '@/lib/format';

function TrustScore({ dq, geocode, extraction }: { dq: number; geocode: number; extraction: number }) {
  const score = (dq + geocode + extraction) / 3;
  const label = score >= 80 ? 'High' : score >= 50 ? 'Moderate' : 'Low';
  return (
    <span>
      {formatPct(score, 0)} <span className="text-[var(--ldv-text-muted)] font-normal">({label})</span>
    </span>
  );
}

function PipelineStatusBadge({ rate }: { rate: number }) {
  const status = rate >= 80 ? 'Healthy' : rate >= 50 ? 'Degraded' : 'Failed';
  const cls =
    status === 'Healthy'
      ? 'bg-emerald-100 text-emerald-800'
      : status === 'Degraded'
        ? 'bg-amber-100 text-amber-800'
        : 'bg-red-100 text-red-800';
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded ${cls}`}>{status}</span>;
}

export default function AuthorityStrip() {
  const { data, isLoading, error } = useSnapshotMeta();

  const isEmpty =
    !isLoading &&
    !error &&
    (data?.disco_count == null || data.disco_count === 0) &&
    (data?.total_rows == null || data.total_rows === 0);

  if (error) {
    return (
      <header className="bg-amber-50 border-b border-[var(--ldv-border)] px-4 py-2.5">
        <p className="text-sm text-amber-800 font-medium">
          Could not load platform signals. Check API connection.
        </p>
      </header>
    );
  }

  if (isEmpty) {
    return (
      <header className="bg-surface border-b border-[var(--ldv-border)] px-4 py-3">
        <p className="text-sm font-medium text-[var(--ldv-text-muted)]">
          Awaiting first national dataset ingestion
        </p>
        <p className="text-xs text-[var(--ldv-text-muted)] mt-0.5">
          Run the pipeline to load NERC MYTO data and populate coverage, freshness, and trust signals.
        </p>
      </header>
    );
  }

  const dq = data?.dq_score ?? 0;
  const geocode = data?.geocode_coverage_pct ?? 0;
  const extraction = data?.extraction_coverage_pct ?? 0;
  const pipelineRate = data?.pipeline_success_rate ?? 0;
  const hasEvidence = extraction > 0; // proxy: extraction coverage implies source PDF/page availability

  return (
    <header className="bg-white border-b border-[var(--ldv-border)] px-4 py-2.5 shadow-sm">
      <div className="flex flex-wrap gap-x-6 gap-y-2 items-center text-sm">
        <div className="font-semibold text-primary text-xs uppercase tracking-wide text-[var(--ldv-text-muted)]">
          National platform signals
        </div>
        <div className="h-4 w-px bg-[var(--ldv-border)]" aria-hidden />
        <div>
          <span className="text-[var(--ldv-text-muted)]">Latest national snapshot:</span>{' '}
          <span className="font-semibold text-primary">
            {isLoading ? '…' : `${data?.disco_count ?? 0} DisCos`} |{' '}
            {isLoading ? '…' : (data?.month_range ? `${data.month_range}` : '—')}
          </span>
        </div>
        <div>
          <span className="text-[var(--ldv-text-muted)]">Data freshness:</span>{' '}
          <span className="font-semibold text-primary">
            {isLoading ? '…' : formatDate(data?.refreshed_at ?? null)}
          </span>
        </div>
        <div>
          <span className="text-[var(--ldv-text-muted)]">Trust score:</span>{' '}
          <span className="font-semibold text-primary">
            {isLoading ? '…' : <TrustScore dq={dq} geocode={geocode} extraction={extraction} />}
          </span>
        </div>
        <div>
          <span className="text-[var(--ldv-text-muted)]">Pipeline status:</span>{' '}
          {isLoading ? '…' : <PipelineStatusBadge rate={pipelineRate} />}
        </div>
        <div>
          <span className="text-[var(--ldv-text-muted)]">Evidence coverage:</span>{' '}
          <span className="font-semibold text-primary">
            {isLoading ? '…' : (hasEvidence ? formatPct(extraction, 1) : '—')}
          </span>
          <span className="text-xs text-[var(--ldv-text-muted)] ml-1">rows with source</span>
        </div>
        <div>
          <span className="text-[var(--ldv-text-muted)]">Geospatial coverage:</span>{' '}
          <span className="font-semibold text-primary">
            {isLoading ? '…' : formatPct(geocode, 1)}
          </span>
          <span className="text-xs text-[var(--ldv-text-muted)] ml-1">high confidence</span>
        </div>
      </div>
    </header>
  );
}
