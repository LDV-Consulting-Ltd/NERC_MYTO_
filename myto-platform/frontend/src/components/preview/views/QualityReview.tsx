'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDQIssues, useDQSummary, useGlobalFilters } from '@/lib/hooks';
import { getDqRules, getExportCommitmentsCsvUrl } from '@/lib/api';
import DQIssuesTable from '@/components/DQIssuesTable';
import { formatNumber } from '@/lib/format';
import { measurePct } from '../measure';
import { PageHeader, LoadingRows, MetricTile, StateBlock, GapNote } from '../ui';

export default function QualityReview() {
  const [status, setStatus] = useState('fail');
  const { filters } = useGlobalFilters();
  const summary = useDQSummary();
  const issues = useDQIssues({ status, limit: 200 });
  const rules = useQuery({
    queryKey: ['dq', 'rules'],
    queryFn: getDqRules,
    staleTime: 60 * 1000,
  });
  const population = summary.data?.total_records;
  const hasPopulation = population != null && population > 0;

  return (
    <div>
      <PageHeader
        title="Data Quality"
        description="Validation score and failing records for the latest scored population. A missing score is not shown as zero."
        productionHref="/dq"
        actions={
          <a
            className="pc-btn"
            href={getExportCommitmentsCsvUrl({
              disco: filters.disco || undefined,
              year: filters.year ?? undefined,
              month: filters.month || undefined,
              band: filters.band || undefined,
            })}
          >
            Download commitments CSV
          </a>
        }
      />
      <GapNote>
        The CSV is the latest commitments export (DisCo, year, month, and band). It is not an export of DQ issues. The issues endpoint has no download.
      </GapNote>
      {summary.isLoading && <LoadingRows />}
      {summary.isError && <StateBlock tone="error" title="Quality summary could not be loaded" />}
      {!summary.isLoading && !summary.isError && !hasPopulation && (
        <StateBlock tone="awaiting" title="No validation population">
          There are no scored records yet. The score stays unpublished until a population exists.
        </StateBlock>
      )}
      {hasPopulation && (
        <section className="pc-metrics">
          <MetricTile label="DQ score" value={measurePct(summary.data?.dq_score, population)} detail="Share of the scored population" />
          <MetricTile label="Scored records" value={formatNumber(population)} />
          <MetricTile
            label="Failing in this page"
            value={issues.isLoading ? '…' : formatNumber(issues.data?.issues.length ?? 0)}
            detail={`Status filter: ${status}`}
          />
        </section>
      )}
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, fontSize: 13 }}>
        Issue status
        <select className="pc-field" style={{ width: 160 }} value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="fail">Fail</option>
          <option value="warn">Warn</option>
          <option value="pass">Pass</option>
        </select>
      </label>
      {issues.isLoading ? <LoadingRows /> : <DQIssuesTable issues={issues.data?.issues ?? []} />}
      <section className="pc-card">
        <div className="pc-card-h"><h2>Rules</h2></div>
        <div className="pc-card-b">
          {(rules.data?.rules ?? []).length === 0 && <p className="pc-gap">No rules returned.</p>}
          <ul>
            {(rules.data?.rules ?? []).map((rule, index) => (
              <li key={index}>{typeof rule === 'string' ? rule : JSON.stringify(rule)}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
