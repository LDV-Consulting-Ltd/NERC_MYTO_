'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { getGovernanceLineage, getGovernanceAudit, getGovernancePolicies } from '@/lib/api';
import LineageViewer from '@/components/LineageViewer';
import { formatDate } from '@/lib/format';

export default function GovernancePage() {
  const { data: lineageData } = useQuery({
    queryKey: queryKeys.governanceLineage(),
    queryFn: async () => (await getGovernanceLineage()).paths,
    staleTime: 60 * 1000,
  });
  const { data: auditData } = useQuery({
    queryKey: queryKeys.governanceAudit(),
    queryFn: async () => (await getGovernanceAudit()).audit,
    staleTime: 60 * 1000,
  });
  const { data: policiesData } = useQuery({
    queryKey: ['governance', 'policies'],
    queryFn: getGovernancePolicies,
    staleTime: 60 * 1000,
  });

  const paths = lineageData ?? [];
  const audit = auditData ?? [];
  const policies = policiesData?.policies ?? [];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--ldv-primary)] tracking-tight mb-2">Governance & Lineage</h1>
      <p className="text-sm text-[var(--ldv-text-muted)] mb-4">
        Audit log, lineage explorer, and data policies.
      </p>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-primary mb-2">Audit log</h2>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>run_id</th>
                <th>refreshed_at</th>
                <th>event</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((a, i) => (
                <tr key={i}>
                  <td className="font-mono text-xs">{a.run_id?.slice(0, 8)}…</td>
                  <td>{formatDate(a.refreshed_at)}</td>
                  <td>{a.event ?? 'promotion'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-primary mb-2">Lineage</h2>
        <LineageViewer paths={paths} />
      </div>
      {Array.isArray(policies) && policies.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-primary mb-2">Policies</h2>
          <ul className="list-disc pl-6 text-sm text-[var(--ldv-text-muted)] space-y-1">
            {(policies as { name?: string; description?: string }[]).map((p, i) => (
              <li key={i}>{p.name ?? p.description ?? JSON.stringify(p)}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
