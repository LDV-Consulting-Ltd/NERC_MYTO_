'use client';

import { useMetricsPipeline, useMetricsGeocode } from '@/lib/hooks';
import MetricsCharts from '@/components/MetricsCharts';
import { useSnapshotMeta } from '@/lib/hooks';
import { formatRelative } from '@/lib/format';

export default function MetricsPage() {
  const { data: pipelineData } = useMetricsPipeline(15);
  const { data: geocode } = useMetricsGeocode();
  const { data: meta } = useSnapshotMeta();

  const stages = pipelineData?.stages ?? [];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--ldv-primary)] tracking-tight mb-2">Metrics & Observability</h1>
      <p className="text-sm text-[var(--ldv-text-muted)] mb-4">
        Pipeline performance, extraction methods, geocode cache, and coverage.
      </p>
      <MetricsCharts stages={stages} geocode={geocode ?? null} />
      <section className="mt-6">
        <h3 className="font-semibold text-primary mb-2">Freshness</h3>
        <p className="text-sm text-[var(--ldv-text-muted)]">
          Last refresh: {formatRelative(meta?.refreshed_at ?? null)}
        </p>
      </section>
    </div>
  );
}
