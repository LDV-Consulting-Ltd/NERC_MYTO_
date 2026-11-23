'use client';

import { useQuery } from '@tanstack/react-query';
import {
  getLayersBronzeArtifacts,
  getLayersBronzePdfs,
  getLayersBronzeTables,
  getLayersGoldDims,
  getLayersGoldFacts,
  getLayersSilverCommitments,
  getLayersSilverDq,
  getLayersSilverGeocode,
} from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { formatNumber } from '@/lib/format';
import { displayValue, errorText, isRecord, measurePct, recordColumns } from '../measure';
import { LoadingRows, MetricTile, PageHeader, StateBlock } from '../ui';

type Layer = 'bronze' | 'silver' | 'gold';

const COPY: Record<Layer, { title: string; production: string; lede: string }> = {
  bronze: {
    title: 'Bronze',
    production: '/layers/bronze',
    lede: 'Discovered PDFs, downloaded artifacts, and raw extracted tables. Counts below are the returned page, not a full warehouse census when the API paginates.',
  },
  silver: {
    title: 'Silver',
    production: '/layers/silver',
    lede: 'Typed commitments, data-quality rows, and geocode coverage after transformation.',
  },
  gold: {
    title: 'Gold',
    production: '/layers/gold',
    lede: 'Warehouse dimensions and supply-commitment facts for the serving layer.',
  },
};

function RecordBlock({ title, rows, loading, error }: { title: string; rows: unknown[]; loading: boolean; error: unknown }) {
  if (loading) return <LoadingRows />;
  if (error) return <StateBlock tone="error" title={`${title} could not be loaded`}>{errorText(error)}</StateBlock>;
  const records = rows.filter(isRecord);
  if (!records.length) return <StateBlock tone="empty" title={`No ${title.toLowerCase()} rows`} />;
  const columns = recordColumns(records);
  return (
    <section className="pc-card">
      <div className="pc-card-h">
        <h2>{title}</h2>
        <span className="pc-num">{formatNumber(records.length)} returned</span>
      </div>
      <div className="pc-table-wrap">
        <table className="pc-table">
          <caption className="pc-sr">{title}</caption>
          <thead>
            <tr>
              {columns.map((key) => <th key={key} scope="col">{key}</th>)}
            </tr>
          </thead>
          <tbody>
            {records.slice(0, 40).map((row, index) => (
              <tr key={index}>
                {columns.map((key) => <td key={key}>{displayValue(row[key])}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function Warehouse({ layer }: { layer: Layer }) {
  const copy = COPY[layer];
  const pdfs = useQuery({
    queryKey: queryKeys.bronzePdfs(undefined, 50, 0),
    queryFn: () => getLayersBronzePdfs(undefined, 50, 0),
    enabled: layer === 'bronze',
  });
  const artifacts = useQuery({
    queryKey: queryKeys.bronzeArtifacts(undefined, 50, 0),
    queryFn: () => getLayersBronzeArtifacts(undefined, 50, 0),
    enabled: layer === 'bronze',
  });
  const tables = useQuery({
    queryKey: queryKeys.bronzeTables({ limit: 50, offset: 0 }),
    queryFn: () => getLayersBronzeTables({ limit: 50, offset: 0 }),
    enabled: layer === 'bronze',
  });
  const silver = useQuery({
    queryKey: queryKeys.silverCommitments(undefined, undefined, 50, 0),
    queryFn: () => getLayersSilverCommitments(undefined, undefined, 50, 0),
    enabled: layer === 'silver',
  });
  const silverDq = useQuery({
    queryKey: queryKeys.silverDq(undefined, undefined, 50, 0),
    queryFn: () => getLayersSilverDq(undefined, undefined, 50, 0),
    enabled: layer === 'silver',
  });
  const geocode = useQuery({
    queryKey: queryKeys.silverGeocode(),
    queryFn: getLayersSilverGeocode,
    enabled: layer === 'silver',
  });
  const dims = useQuery({
    queryKey: queryKeys.goldDims(),
    queryFn: getLayersGoldDims,
    enabled: layer === 'gold',
  });
  const facts = useQuery({
    queryKey: queryKeys.goldFacts({ limit: 50, offset: 0 }),
    queryFn: () => getLayersGoldFacts({ limit: 50, offset: 0 }),
    enabled: layer === 'gold',
  });

  return (
    <div>
      <PageHeader title={copy.title} description={copy.lede} productionHref={copy.production} />
      {layer === 'bronze' && (
        <>
          <section className="pc-metrics">
            <MetricTile label="PDFs in page" value={pdfs.isError ? '—' : pdfs.isLoading ? '…' : formatNumber(pdfs.data?.items.length ?? 0)} detail="Returned registry rows" />
            <MetricTile label="Artifacts in page" value={artifacts.isError ? '—' : artifacts.isLoading ? '…' : formatNumber(artifacts.data?.items.length ?? 0)} />
            <MetricTile label="Raw tables in page" value={tables.isError ? '—' : tables.isLoading ? '…' : formatNumber(tables.data?.items.length ?? 0)} />
          </section>
          <RecordBlock title="PDF registry" rows={pdfs.data?.items ?? []} loading={pdfs.isLoading} error={pdfs.error} />
          <RecordBlock title="Artifacts" rows={artifacts.data?.items ?? []} loading={artifacts.isLoading} error={artifacts.error} />
          <RecordBlock title="Raw tables" rows={tables.data?.items ?? []} loading={tables.isLoading} error={tables.error} />
        </>
      )}
      {layer === 'silver' && (
        <>
          <section className="pc-metrics">
            <MetricTile label="Commitments in page" value={silver.isError ? '—' : silver.isLoading ? '…' : formatNumber(silver.data?.items.length ?? 0)} />
            <MetricTile label="DQ rows in page" value={silverDq.isError ? '—' : silverDq.isLoading ? '…' : formatNumber(silverDq.data?.items.length ?? 0)} />
            <MetricTile label="Geocode coverage" value={measurePct(geocode.data?.geocode_coverage_pct, geocode.data?.total)} />
          </section>
          <RecordBlock title="Silver commitments" rows={silver.data?.items ?? []} loading={silver.isLoading} error={silver.error} />
          <RecordBlock title="Silver DQ" rows={silverDq.data?.items ?? []} loading={silverDq.isLoading} error={silverDq.error} />
        </>
      )}
      {layer === 'gold' && (
        <>
          <RecordBlock title="Dimensions" rows={Array.isArray(dims.data) ? dims.data : []} loading={dims.isLoading} error={dims.error} />
          <RecordBlock title="Facts" rows={facts.data?.items ?? []} loading={facts.isLoading} error={facts.error} />
        </>
      )}
    </div>
  );
}
