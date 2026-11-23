'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { getLayersBronzePdfs, getLayersBronzeArtifacts, getLayersBronzeTables } from '@/lib/api';

export default function BronzeLayerPage() {
  const { data: pdfsData } = useQuery({
    queryKey: queryKeys.bronzePdfs(undefined, 100, 0),
    queryFn: () => getLayersBronzePdfs(undefined, 100, 0),
    staleTime: 60 * 1000,
  });
  const { data: artifactsData } = useQuery({
    queryKey: queryKeys.bronzeArtifacts(undefined, 100, 0),
    queryFn: () => getLayersBronzeArtifacts(undefined, 100, 0),
    staleTime: 60 * 1000,
  });
  const { data: tablesData } = useQuery({
    queryKey: queryKeys.bronzeTables({ limit: 50, offset: 0 }),
    queryFn: () => getLayersBronzeTables({ limit: 50, offset: 0 }),
    staleTime: 60 * 1000,
  });

  const pdfs = pdfsData?.items ?? [];
  const artifacts = artifactsData?.items ?? [];
  const tables = tablesData?.items ?? [];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--ldv-primary)] tracking-tight mb-2">Bronze</h1>
      <p className="text-sm text-[var(--ldv-text-muted)] mb-4">
        PDF ingestion metrics, raw table extraction, and document coverage.
      </p>
      <section className="mb-6">
        <h2 className="text-base font-semibold text-[var(--ldv-primary)] mb-3">PDF ingestion metrics</h2>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <div className="kpi-card p-4">
            <div className="text-xs font-medium text-[var(--ldv-text-muted)]">PDFs discovered</div>
            <div className="text-xl font-semibold text-[var(--ldv-primary)] mt-1">{Array.isArray(pdfs) ? pdfs.length : 0}</div>
            <div className="text-xs text-[var(--ldv-text-muted)] mt-0.5">bronze.pdf_registry</div>
          </div>
          <div className="kpi-card p-4">
            <div className="text-xs font-medium text-[var(--ldv-text-muted)]">PDFs downloaded</div>
            <div className="text-xl font-semibold text-[var(--ldv-primary)] mt-1">{Array.isArray(artifacts) ? artifacts.length : 0}</div>
            <div className="text-xs text-[var(--ldv-text-muted)] mt-0.5">bronze.pdf_artifact</div>
          </div>
          <div className="kpi-card p-4">
            <div className="text-xs font-medium text-[var(--ldv-text-muted)]">Raw tables extracted</div>
            <div className="text-xl font-semibold text-[var(--ldv-primary)] mt-1">{Array.isArray(tables) ? tables.length : 0}</div>
            <div className="text-xs text-[var(--ldv-text-muted)] mt-0.5">bronze.pdf_table_raw (sample)</div>
          </div>
          <div className="kpi-card p-4">
            <div className="text-xs font-medium text-[var(--ldv-text-muted)]">Document coverage</div>
            <div className="text-sm font-semibold text-[var(--ldv-primary)] mt-1">
              {Array.isArray(pdfs) && Array.isArray(artifacts) && pdfs.length > 0
                ? `${Math.round((artifacts.length / pdfs.length) * 100)}%`
                : '—'}
            </div>
            <div className="text-xs text-[var(--ldv-text-muted)] mt-0.5">Downloaded vs discovered</div>
          </div>
        </div>
      </section>
      <div className="space-y-4">
        <section>
          <h2 className="text-lg font-semibold text-[var(--ldv-primary)] mb-2">PDF Registry</h2>
          <p className="text-sm text-[var(--ldv-text-muted)] mb-2">
            Discover stage. Columns: title, disco_code, month_name, year, pdf_url, discovered_at.
          </p>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Sample (first row keys)</th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(pdfs) ? pdfs.slice(0, 20) : []).map((p, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td className="font-mono text-xs">
                      {typeof p === 'object' && p !== null ? Object.keys(p as object).join(', ') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-[var(--ldv-primary)] mb-2">Artifacts</h2>
          <p className="text-sm text-[var(--ldv-text-muted)]">bronze.pdf_artifact: downloaded PDFs, sha256, http_status.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-[var(--ldv-primary)] mb-2">Raw tables</h2>
          <p className="text-sm text-[var(--ldv-text-muted)]">bronze.pdf_table_raw: page_no, table_index, method, rows_jsonb.</p>
        </section>
      </div>
    </div>
  );
}
