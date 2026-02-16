'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useMetadataDatasets, useMetadataSchema, useMetadataDictionary } from '@/lib/hooks';
import SchemaViewer from '@/components/SchemaViewer';
import { endpoints } from '@/lib/endpoints';
import { queryKeys } from '@/lib/queryKeys';
import { formatDate } from '@/lib/format';

export default function MetadataPage() {
  const { data: datasets = [] } = useMetadataDatasets();
  const [selected, setSelected] = useState<string | null>(null);
  const { data: schema } = useMetadataSchema(selected);
  const { data: dictionary = [] } = useMetadataDictionary();
  const { data: freshness } = useQuery({
    queryKey: queryKeys.metadataFreshness(),
    queryFn: async () => {
      const r = await fetch(endpoints.metadataFreshness());
      if (!r.ok) throw new Error(await r.text());
      const j = await r.json();
      return (j?.data ?? j) as Record<string, unknown>;
    },
    staleTime: 60 * 1000,
  });
  const { data: coverage } = useQuery({
    queryKey: queryKeys.metadataCoverage(),
    queryFn: async () => {
      const r = await fetch(endpoints.metadataCoverage());
      if (!r.ok) throw new Error(await r.text());
      const j = await r.json();
      return (j?.data ?? j) as Record<string, unknown>;
    },
    staleTime: 60 * 1000,
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--ldv-primary)] tracking-tight mb-2">Metadata Catalog</h1>
      <p className="text-sm text-[var(--ldv-text-muted)] mb-4">
        Datasets (bronze.*, silver.*, gold.*). Select a dataset to view schema, columns, freshness and coverage.
      </p>
      <div className="flex flex-wrap gap-2 mb-4">
        <Link href="/governance" className="btn-secondary">Lineage</Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2 mb-4">
        <div className="kpi-card p-3">
          <div className="text-xs text-[var(--ldv-text-muted)]">Freshness</div>
          <div className="text-sm font-semibold">{freshness?.refreshed_at ? formatDate(String(freshness.refreshed_at)) : (freshness?.latest_run_id ? `Run ${String(freshness.latest_run_id).slice(0, 8)}…` : '—')}</div>
        </div>
        <div className="kpi-card p-3">
          <div className="text-xs text-[var(--ldv-text-muted)]">Coverage</div>
          <div className="text-sm font-semibold">Geocode: {coverage?.geocode_coverage_pct != null ? `${coverage.geocode_coverage_pct}%` : '—'} · Rows: {coverage?.total_records != null ? String(coverage.total_records) : '—'}</div>
        </div>
      </div>
      <div className="grid md:grid-cols-[240px_1fr] gap-4">
        <div className="overflow-y-auto max-h-[400px] space-y-1">
          {datasets.map((d) => (
            <button
              key={d.name}
              type="button"
              onClick={() => setSelected(d.name)}
              className={`w-full text-left px-3 py-2 rounded text-sm border ${
                selected === d.name
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white border-[var(--ldv-border)] hover:bg-surface'
              }`}
            >
              {d.name}
            </button>
          ))}
        </div>
        <div>
          {schema && (
            <SchemaViewer
              name={schema.name}
              columns={schema.columns ?? []}
            />
          )}
          {selected && !schema && <p className="text-[var(--ldv-text-muted)]">Loading schema…</p>}
        </div>
      </div>
      <div className="mt-6">
        <h2 className="text-lg font-semibold text-primary mb-2">Column dictionary</h2>
        <p className="text-sm text-[var(--ldv-text-muted)] mb-2">Read-only column definitions.</p>
        {Array.isArray(dictionary) && dictionary.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Column</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {(dictionary as { name?: string; description?: string; column?: string; definition?: string }[]).slice(0, 100).map((c, i) => (
                  <tr key={i}>
                    <td className="font-mono text-sm">{c.name ?? c.column ?? '—'}</td>
                    <td className="text-sm">{c.description ?? c.definition ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-[var(--ldv-text-muted)]">No column dictionary.</p>
        )}
      </div>
    </div>
  );
}
