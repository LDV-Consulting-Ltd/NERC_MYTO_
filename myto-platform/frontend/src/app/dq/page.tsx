'use client';

import { useState, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDQSummary, useDQIssues } from '@/lib/hooks';
import DQScoreCard from '@/components/DQScoreCard';
import DQIssuesTable from '@/components/DQIssuesTable';
import { getExportCommitmentsCsvUrl, getDqRules } from '@/lib/api';
import { useGlobalFilters } from '@/lib/hooks';
import { queryKeys } from '@/lib/queryKeys';

function DQPageContent() {
  const [statusFilter, setStatusFilter] = useState('fail');
  const { filters } = useGlobalFilters();
  const { data: summary } = useDQSummary();
  const { data: issuesData, isLoading } = useDQIssues({ status: statusFilter, limit: 200 });
  const { data: rulesData } = useQuery({
    queryKey: ['dq', 'rules'],
    queryFn: getDqRules,
    staleTime: 60 * 1000,
  });

  const issues = issuesData?.issues ?? [];
  const rules = rulesData?.rules ?? [];
  const exportUrl = getExportCommitmentsCsvUrl({
    disco: filters.disco || undefined,
    year: filters.year ?? undefined,
    month: filters.month || undefined,
    band: filters.band || undefined,
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--ldv-primary)] tracking-tight mb-2">Data Quality</h1>
      <p className="text-sm text-[var(--ldv-text-muted)] mb-4">
        National DQ score, trend, and issues. Filter by severity; export with current filters.
      </p>
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <DQScoreCard
          dqScore={summary?.dq_score}
          totalRecords={summary?.total_records}
        />
        <a href={exportUrl} download="commitments.csv" className="btn-secondary">
          Export CSV (current filters)
        </a>
      </div>
      <div className="mb-4">
        <label className="text-sm mr-2">Status:</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-[var(--ldv-border)] rounded px-2 py-1.5 text-sm"
        >
          <option value="fail">fail</option>
          <option value="pass">pass</option>
        </select>
      </div>
      {isLoading && <p className="text-[var(--ldv-text-muted)]">Loading…</p>}
      <DQIssuesTable issues={issues} />
      <div className="mt-6 p-3 bg-surface rounded border border-[var(--ldv-border)]">
        <h2 className="font-semibold text-primary mb-2">Trend</h2>
        <p className="text-sm text-[var(--ldv-text-muted)]">TODO: DQ score timeseries when backend provides /v1/dq/timeseries or similar.</p>
      </div>
      {Array.isArray(rules) && rules.length > 0 && (
        <div className="mt-6">
          <h2 className="font-semibold text-primary mb-2">DQ rules</h2>
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Rule</th></tr>
              </thead>
              <tbody>
                {(rules as { name?: string; id?: string }[]).slice(0, 20).map((r, i) => (
                  <tr key={i}><td className="font-mono text-sm">{r.name ?? r.id ?? JSON.stringify(r)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DQPage() {
  return (
    <Suspense fallback={<div className="text-[var(--ldv-text-muted)] p-4">Loading…</div>}>
      <DQPageContent />
    </Suspense>
  );
}
