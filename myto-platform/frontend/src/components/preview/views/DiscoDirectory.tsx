'use client';

import Link from 'next/link';
import { errorText, isPublishedSnapshot } from '../measure';
import { useDemo, useDiscoList, useFreshness, usePreviewHref } from '../useConsoleData';
import { LoadingRows, PageHeader, StateBlock } from '../ui';

export default function DiscoDirectory() {
  const demo = useDemo();
  const href = usePreviewHref();
  const freshness = useFreshness(demo);
  const discos = useDiscoList(demo);
  const published = isPublishedSnapshot(freshness.data);

  return (
    <div>
      <PageHeader
        title="DisCo Profiles"
        description="Each distribution company has one profile for coverage, reporting periods, feeder commitments, and source orders."
        productionHref="/discos"
        period={freshness.isLoading ? 'Loading…' : published ? freshness.data?.month_range || 'Not provided' : 'Not published'}
      />
      {discos.isLoading && <LoadingRows />}
      {discos.isError && (
        <StateBlock tone="error" title="DisCo list could not be loaded">{errorText(discos.error)}</StateBlock>
      )}
      {!discos.isLoading && !discos.isError && !published && (
        <StateBlock tone="awaiting" title="No published DisCo list">
          Profiles appear after the first national snapshot is promoted.
        </StateBlock>
      )}
      {!discos.isLoading && !discos.isError && published && (discos.data ?? []).length === 0 && (
        <StateBlock tone="empty" title="No DisCos in the published snapshot" />
      )}
      <ul className="pc-metrics" style={{ listStyle: 'none', padding: 0 }}>
        {(published ? discos.data ?? [] : []).map((code) => (
          <li key={code} className="pc-metric">
            <p className="pc-metric-label">DisCo</p>
            <p className="pc-metric-value">{code}</p>
            <p style={{ display: 'flex', gap: 10 }}>
              <Link href={href(`/discos/${encodeURIComponent(code)}`)}>Profile</Link>
              <Link href={href('/commitments', { disco: code })}>Commitments</Link>
              <Link href={href('/map', { disco: code })}>Map</Link>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
