'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useGlobalFilters } from '@/lib/hooks';
import { endpoints } from '@/lib/endpoints';

const BASE_URL =
  typeof window !== 'undefined'
    ? process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || '/api/v1'
    : '/api/v1';

const ENDPOINT_CATALOG = [
  { title: 'Health', endpoints: [{ method: 'GET', path: '/v1/healthz', url: () => endpoints.healthz() }, { method: 'GET', path: '/v1/health', url: () => endpoints.health() }] },
  {
    title: 'Latest data (serving layer)',
    endpoints: [
      { method: 'GET', path: '/v1/latest/discos', url: () => endpoints.latestDiscos() },
      { method: 'GET', path: '/v1/latest/months', url: () => endpoints.latestMonths() },
      { method: 'GET', path: '/v1/latest/commitments', url: () => endpoints.latestCommitments({ limit: 10 }) },
      { method: 'GET', path: '/v1/latest/map-points', url: () => endpoints.latestMapPoints() },
      { method: 'GET', path: '/v1/latest/search', url: () => endpoints.latestSearch('feeder', 10, 0) },
    ],
  },
  {
    title: 'Runs & pipeline',
    endpoints: [
      { method: 'GET', path: '/v1/runs', url: () => endpoints.runs(20, 0) },
      { method: 'POST', path: '/v1/runs', url: () => endpoints.createRun() },
    ],
  },
  {
    title: 'Exports & downloads',
    endpoints: [
      { method: 'GET', path: '/v1/exports/latest/commitments.csv', url: () => endpoints.exportCommitmentsCsv() },
      { method: 'GET', path: '/v1/exports/latest/commitments.parquet', url: () => endpoints.exportCommitmentsParquet() },
      { method: 'GET', path: '/v1/exports/latest/map.geojson', url: () => endpoints.exportMapGeojson() },
    ],
  },
];

function DataApisPageContent() {
  const { toApiParams } = useGlobalFilters();
  const [tryUrl, setTryUrl] = useState('');
  const [tryResult, setTryResult] = useState<string | null>(null);

  const tryIt = async () => {
    if (!tryUrl.trim()) return;
    setTryResult('Loading…');
    try {
      const res = await fetch(tryUrl);
      const text = await res.text();
      setTryResult(`Status: ${res.status}\n${text.slice(0, 2000)}`);
    } catch (e) {
      setTryResult(`Error: ${(e as Error).message}`);
    }
  };

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold text-[var(--ldv-primary)] tracking-tight mb-2">
        Data APIs & Downloads
      </h1>
      <p className="text-sm text-[var(--ldv-text-muted)] mb-6">
        Regulator-grade electricity data API. Query latest commitments, map points, and export datasets. Base URL: <code className="bg-[var(--ldv-surface)] px-1.5 py-0.5 rounded text-[var(--ldv-primary)]">{BASE_URL}</code>
      </p>

      {/* Endpoint catalog */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--ldv-text-muted)] mb-3">
          Endpoint catalog
        </h2>
        <div className="border border-[var(--ldv-border)] rounded-lg bg-white overflow-hidden">
          {ENDPOINT_CATALOG.map((cat) => (
            <div key={cat.title} className="border-b border-[var(--ldv-border)] last:border-b-0">
              <div className="px-4 py-2 bg-[var(--ldv-surface)] text-sm font-medium text-[var(--ldv-primary)]">
                {cat.title}
              </div>
              <ul className="divide-y divide-[var(--ldv-border)]">
                {cat.endpoints.map((ep) => (
                  <li key={ep.path} className="px-4 py-2.5 flex flex-wrap items-baseline gap-2">
                    <span className="font-mono text-xs font-semibold text-[var(--ldv-accent)]">{ep.method}</span>
                    <code className="text-sm text-[var(--ldv-support)]">{ep.path}</code>
                    <span className="text-xs text-[var(--ldv-text-muted)] truncate">{ep.url()}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Try query builder */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--ldv-text-muted)] mb-3">
          Try query
        </h2>
        <div className="border border-[var(--ldv-border)] rounded-lg p-4 bg-white">
          <p className="text-sm text-[var(--ldv-text-muted)] mb-3">
            Paste a full URL (e.g. with <code className="bg-surface px-1 rounded">disco_code</code>, <code className="bg-surface px-1 rounded">year</code>, <code className="bg-surface px-1 rounded">month</code>). Current global filters: {JSON.stringify(toApiParams())}.
          </p>
          <div className="flex gap-2 flex-wrap">
            <input
              type="url"
              value={tryUrl}
              onChange={(e) => setTryUrl(e.target.value)}
              placeholder={`${BASE_URL}/latest/discos`}
              className="flex-1 min-w-[200px] border border-[var(--ldv-border)] rounded px-3 py-2 text-sm"
            />
            <button type="button" onClick={tryIt} className="btn-primary">
              Send request
            </button>
          </div>
          {tryResult && (
            <pre className="mt-3 p-3 bg-[var(--ldv-surface)] rounded text-xs overflow-auto max-h-60 whitespace-pre-wrap border border-[var(--ldv-border)]">
              {tryResult}
            </pre>
          )}
        </div>
      </section>

      {/* Download links */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--ldv-text-muted)] mb-3">
          Download links
        </h2>
        <ul className="space-y-2">
          <li>
            <a href={endpoints.exportCommitmentsCsv()} target="_blank" rel="noopener noreferrer" className="text-[var(--ldv-support)] hover:underline font-medium">
              Latest commitments (CSV)
            </a>
          </li>
          <li>
            <a href={endpoints.exportCommitmentsParquet()} target="_blank" rel="noopener noreferrer" className="text-[var(--ldv-support)] hover:underline font-medium">
              Latest commitments (Parquet)
            </a>
          </li>
          <li>
            <a href={endpoints.exportMapGeojson()} target="_blank" rel="noopener noreferrer" className="text-[var(--ldv-support)] hover:underline font-medium">
              Map points (GeoJSON)
            </a>
          </li>
        </ul>
      </section>

      {/* API key onboarding placeholder */}
      <section className="border border-[var(--ldv-border)] rounded-lg p-4 bg-[var(--ldv-surface)]/50">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--ldv-text-muted)] mb-2">
          API key & access
        </h2>
        <p className="text-sm text-[var(--ldv-text-muted)]">
          Authenticated API key onboarding for production and high-volume use is coming soon. For now, use the base URL with your deployment. For endpoint coverage audit, see <Link href="/coverage" className="text-[var(--ldv-support)] hover:underline">Coverage</Link> (Admin).
        </p>
      </section>
    </div>
  );
}

export default function DataApisPage() {
  return (
    <Suspense fallback={<div className="text-[var(--ldv-text-muted)] p-4">Loading…</div>}>
      <DataApisPageContent />
    </Suspense>
  );
}
