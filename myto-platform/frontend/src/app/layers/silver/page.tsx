'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { getLayersSilverCommitments, getLayersSilverDq, getLayersSilverGeocode, getRuns } from '@/lib/api';

export default function SilverLayerPage() {
  const { data: runsRaw } = useQuery({
    queryKey: queryKeys.runs(1, 0),
    queryFn: () => getRuns(1, 0),
    staleTime: 60 * 1000,
  });
  const runs = Array.isArray(runsRaw) ? runsRaw : [];
  const latestRunId = runs[0] && typeof runs[0] === 'object' && runs[0] !== null && 'run_id' in runs[0] ? String((runs[0] as { run_id: string }).run_id) : undefined;

  const { data: commitmentsData } = useQuery({
    queryKey: queryKeys.silverCommitments(undefined, undefined, 100, 0),
    queryFn: () => getLayersSilverCommitments(undefined, undefined, 100, 0),
    staleTime: 60 * 1000,
  });
  const latestEmpty = Array.isArray(commitmentsData?.items) && commitmentsData.items.length === 0;
  const { data: runScopedData } = useQuery({
    queryKey: queryKeys.silverCommitments(latestRunId, undefined, 100, 0),
    queryFn: () => getLayersSilverCommitments(latestRunId, undefined, 100, 0),
    staleTime: 60 * 1000,
    enabled: !!latestRunId && latestEmpty,
  });

  const { data: dqData } = useQuery({
    queryKey: queryKeys.silverDq(undefined, 'fail', 200, 0),
    queryFn: () => getLayersSilverDq(undefined, 'fail', 200, 0),
    staleTime: 60 * 1000,
  });
  const { data: geocodeData } = useQuery({
    queryKey: queryKeys.silverGeocode(),
    queryFn: getLayersSilverGeocode,
    staleTime: 60 * 1000,
  });

  const commitments = (latestEmpty && runScopedData?.items?.length ? runScopedData.items : commitmentsData?.items) ?? [];
  const showingRunFallback = latestEmpty && !!runScopedData?.items?.length && latestRunId;
  const dqItems = dqData?.items ?? [];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--ldv-primary)] tracking-tight mb-2">Silver</h1>
      <p className="text-sm text-[var(--ldv-text-muted)] mb-4">
        Typed commitment dataset, DQ pass rate, and geocode confidence distribution.
      </p>
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="kpi-card p-4">
          <div className="text-xs text-[var(--ldv-text-muted)]">Commitments (sample)</div>
          <div className="text-xl font-semibold text-primary">{Array.isArray(commitments) ? commitments.length : 0}</div>
        </div>
        <div className="kpi-card p-4">
          <div className="text-xs text-[var(--ldv-text-muted)]">DQ issues (fail)</div>
          <div className="text-xl font-semibold text-primary">{Array.isArray(dqItems) ? dqItems.length : 0}</div>
        </div>
        <div className="kpi-card p-4">
          <div className="text-xs text-[var(--ldv-text-muted)]">Geocode coverage</div>
          <div className="text-xl font-semibold text-primary">
            {geocodeData?.geocode_coverage_pct != null ? `${geocodeData.geocode_coverage_pct}%` : '—'}
          </div>
        </div>
        <div className="kpi-card p-4">
          <div className="text-xs text-[var(--ldv-text-muted)]">Geocoded / total</div>
          <div className="text-xl font-semibold text-primary">
            {geocodeData?.geocoded != null && geocodeData?.total != null
              ? `${geocodeData.geocoded} / ${geocodeData.total}`
              : '—'}
          </div>
        </div>
      </div>
      <section>
        <h2 className="text-lg font-semibold text-primary mb-2">Silver commitments</h2>
        <p className="text-sm text-[var(--ldv-text-muted)] mb-2">
          {showingRunFallback
            ? `Showing data for run ${latestRunId.slice(0, 8)}… (latest snapshot is empty). Full table in Explorer.`
            : 'Latest run sample. Full table in Explorer.'}
        </p>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Sample keys</th>
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(commitments) ? commitments.slice(0, 15) : []).map((c, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td className="font-mono text-xs">
                    {typeof c === 'object' && c !== null ? Object.keys(c as object).join(', ') : '—'}
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
