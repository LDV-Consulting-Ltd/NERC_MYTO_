'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { getLayersGoldDims, getLayersGoldFacts } from '@/lib/api';
import { useSnapshotMeta } from '@/lib/hooks';
import { formatDate } from '@/lib/format';
import MermaidDiagram from '@/components/MermaidDiagram';
import { STAR_SCHEMA_DIAGRAM } from '@/lib/diagrams';

export default function GoldLayerPage() {
  const { data: snapshotMeta } = useSnapshotMeta();
  const { data: dims } = useQuery({
    queryKey: queryKeys.goldDims(),
    queryFn: getLayersGoldDims,
    staleTime: 60 * 1000,
  });
  const { data: factsData } = useQuery({
    queryKey: queryKeys.goldFacts({ limit: 50, offset: 0 }),
    queryFn: () => getLayersGoldFacts({ limit: 50, offset: 0 }),
    staleTime: 60 * 1000,
  });

  const dimList = Array.isArray(dims) ? dims : [];
  const facts = factsData?.items ?? [];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--ldv-primary)] tracking-tight mb-2">Gold Warehouse</h1>
      <p className="text-sm text-[var(--ldv-text-muted)] mb-4">
        Star schema dimensions and facts, latest snapshot status, warehouse readiness.
      </p>
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="kpi-card p-4">
          <div className="text-xs text-[var(--ldv-text-muted)]">Dimensions</div>
          <div className="text-xl font-semibold text-[var(--ldv-primary)]">{dimList.length}</div>
        </div>
        <div className="kpi-card p-4">
          <div className="text-xs text-[var(--ldv-text-muted)]">Facts (sample)</div>
          <div className="text-xl font-semibold text-[var(--ldv-primary)]">{Array.isArray(facts) ? facts.length : 0}</div>
        </div>
        <div className="kpi-card p-4">
          <div className="text-xs text-[var(--ldv-text-muted)]">Latest snapshot refreshed</div>
          <div className="text-sm font-semibold text-[var(--ldv-primary)]">{formatDate(snapshotMeta?.refreshed_at ?? null)}</div>
        </div>
      </div>
      <section className="mb-6">
        <h2 className="text-base font-semibold text-[var(--ldv-primary)] mb-2">Star schema</h2>
        <div className="border border-[var(--ldv-border)] rounded-lg p-4 bg-white overflow-auto">
          <MermaidDiagram chart={STAR_SCHEMA_DIAGRAM} id="gold-star-schema" className="min-h-[280px]" />
        </div>
      </section>
      <section className="mb-4">
        <h2 className="text-base font-semibold text-[var(--ldv-primary)] mb-2">Warehouse readiness</h2>
        <ul className="list-none space-y-1.5 text-sm">
          <li className="flex items-center gap-2">
            <span className={dimList.length >= 4 ? 'text-emerald-600' : 'text-[var(--ldv-text-muted)]'}>●</span>
            Dimensions loaded: {dimList.length} (dim_disco, dim_date, dim_feeder, dim_location)
          </li>
          <li className="flex items-center gap-2">
            <span className={Array.isArray(facts) && facts.length > 0 ? 'text-emerald-600' : 'text-[var(--ldv-text-muted)]'}>●</span>
            Fact table populated: {Array.isArray(facts) ? facts.length : 0} sample rows
          </li>
          <li className="flex items-center gap-2">
            <span className={snapshotMeta?.refreshed_at ? 'text-emerald-600' : 'text-[var(--ldv-text-muted)]'}>●</span>
            Latest snapshot: {snapshotMeta?.refreshed_at ? 'Refreshed' : 'Pending'}
          </li>
        </ul>
      </section>
      <section>
        <h2 className="text-lg font-semibold text-[var(--ldv-primary)] mb-2">Dims</h2>
        <ul className="list-disc pl-6 text-sm">
          {dimList.map((d: unknown, i) => (
            <li key={i}>{typeof d === 'object' && d && 'name' in (d as object) ? String((d as { name: string }).name) : String(d)}</li>
          ))}
        </ul>
      </section>
      <section className="mt-4">
        <h2 className="text-lg font-semibold text-[var(--ldv-primary)] mb-2">Facts sample</h2>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Keys</th>
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(facts) ? facts.slice(0, 20) : []).map((f, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td className="font-mono text-xs">
                    {typeof f === 'object' && f !== null ? Object.keys(f as object).join(', ') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
