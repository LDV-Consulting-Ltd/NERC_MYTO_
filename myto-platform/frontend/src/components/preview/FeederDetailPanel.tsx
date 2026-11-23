'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { getLatestFeeder } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { formatConfidence, formatNumber } from '@/lib/format';
import EvidenceLink from '@/components/EvidenceLink';
import type { FeederSelection } from './selection';
import { useDemo, usePreviewHref } from './useConsoleData';

export default function FeederDetailPanel({
  selection,
  onClose,
}: {
  selection: FeederSelection | null;
  onClose: () => void;
}) {
  const href = usePreviewHref();
  const demo = useDemo();
  const feederKey = selection?.feederKey ?? null;
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.feeder(feederKey ?? 0),
    queryFn: () => getLatestFeeder(feederKey!),
    enabled: !demo && feederKey != null && feederKey > 0,
  });

  useEffect(() => {
    if (!selection) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selection, onClose]);

  if (!selection) return null;

  const hours =
    selection.minSupplyHours == null || Number.isNaN(selection.minSupplyHours)
      ? 'Not published'
      : `${formatNumber(selection.minSupplyHours)} hours`;

  const history = data?.rows ?? [];

  return (
    <aside className="pc-detail" aria-label="Feeder detail">
      <div className="pc-detail-bar">
        <h2>Feeder detail</h2>
        <button type="button" className="pc-btn pc-btn-ghost" onClick={onClose}>
          Close
        </button>
      </div>
      <dl className="pc-detail-list">
        <div>
          <dt>Feeder</dt>
          <dd>{selection.feederName || '—'}</dd>
        </div>
        <div>
          <dt>DisCo</dt>
          <dd>
            <Link href={href(`/discos/${encodeURIComponent(selection.discoCode)}`)}>{selection.discoCode}</Link>
          </dd>
        </div>
        <div>
          <dt>Service band</dt>
          <dd>{selection.band || '—'}</dd>
        </div>
        <div>
          <dt>Published commitment</dt>
          <dd className="pc-num">{hours}</dd>
        </div>
        <div>
          <dt>Reporting period</dt>
          <dd>{selection.periodLabel || 'Not published'}</dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>{selection.location || '—'}</dd>
        </div>
        <div>
          <dt>Source reference</dt>
          <dd>
            {selection.sourcePdfUrl || selection.sourcePageNo != null ? (
              <EvidenceLink pdfUrl={selection.sourcePdfUrl} pageNo={selection.sourcePageNo} />
            ) : (
              'No source document on this record'
            )}
          </dd>
        </div>
        <div>
          <dt>Location confidence</dt>
          <dd>
            {selection.geocodeConfidence == null
              ? 'Not scored'
              : formatConfidence(selection.geocodeConfidence)}
            {selection.geocodeProvider ? ` · ${selection.geocodeProvider}` : ''}
            <span className="pc-detail-note">
              {selection.mapped ? 'Coordinates are present.' : 'No coordinates on this record.'}
            </span>
          </dd>
        </div>
      </dl>
      <p className="pc-detail-note">
        Published commitment is the minimum supply hours in the NERC order. Measured service performance is not in this snapshot.
        Location confidence is a geocoding score, separate from the commitment.
      </p>
      {isLoading && <p className="pc-detail-note">Loading feeder history…</p>}
      {error && (
        <p className="pc-detail-note">Feeder history could not be loaded. The fields above come from the selected row.</p>
      )}
      {history.length > 0 && (
        <div className="pc-detail-history">
          <h3>Published history</h3>
          <ul>
            {history.slice(0, 8).map((row, index) => (
              <li key={`${row.date_key}-${index}`}>
                <span>{row.disco_code}</span>
                <span>{row.band || '—'}</span>
                <span className="pc-num">
                  {row.min_supply_hours == null ? 'Not published' : `${formatNumber(row.min_supply_hours)} h`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {demo && (
        <p className="pc-detail-note">Demo records do not call the feeder history endpoint.</p>
      )}
    </aside>
  );
}
