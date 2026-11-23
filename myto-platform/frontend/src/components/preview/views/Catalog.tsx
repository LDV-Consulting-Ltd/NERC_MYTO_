'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  getCatalogTables,
  getExportCommitmentsCsvUrl,
  getExportCommitmentsParquetUrl,
  getExportMapGeojsonUrl,
  getGovernanceAudit,
  getGovernanceLineage,
  getGovernancePolicies,
  getLineageGraph,
  getMetricsExtractionMethods,
  getMetricsPipeline,
} from '@/lib/api';
import { endpoints } from '@/lib/endpoints';
import { queryKeys } from '@/lib/queryKeys';
import { useMetadataDatasets, useMetadataDictionary, useMetadataSchema, useMetricsGeocode } from '@/lib/hooks';
import { useGlobalFilters } from '@/lib/hooks';
import LineageGraph, { LineageLegend } from '@/components/LineageGraph';
import MermaidDiagram from '@/components/MermaidDiagram';
import SchemaViewer from '@/components/SchemaViewer';
import { MEDALLION_DIAGRAM, LINEAGE_DIAGRAM } from '@/lib/diagrams';
import { FEATURE_INVENTORY } from '../paths';
import { displayValue, errorText, isRecord } from '../measure';
import { GapNote, LoadingRows, PageHeader, StateBlock } from '../ui';

export function DatasetsView() {
  const datasets = useMetadataDatasets();
  const tables = useQuery({
    queryKey: queryKeys.catalogTables({}),
    queryFn: () => getCatalogTables({}),
  });
  return (
    <div>
      <PageHeader
        title="Datasets"
        description="Registered datasets and catalog tables. Schema detail is on the metadata catalog."
        productionHref="/metadata"
      />
      {datasets.isLoading && <LoadingRows />}
      {datasets.isError && <StateBlock tone="error" title="Datasets could not be loaded">{errorText(datasets.error)}</StateBlock>}
      {!datasets.isLoading && (datasets.data ?? []).length === 0 && <StateBlock tone="empty" title="No datasets registered" />}
      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 8 }}>
        {(datasets.data ?? []).map((dataset) => (
          <li key={dataset.name} className="pc-card" style={{ padding: 12 }}>
            <strong>{dataset.name}</strong>
            <span className="pc-pill pc-pill-neutral" style={{ marginLeft: 8 }}>{dataset.layer}</span>
            <p className="pc-lede">{dataset.description}</p>
          </li>
        ))}
      </ul>
      {tables.isError && <StateBlock tone="error" title="Catalog tables could not be loaded">{errorText(tables.error)}</StateBlock>}
      {(tables.data ?? []).length > 0 && (
        <div className="pc-table-wrap">
          <table className="pc-table">
            <caption className="pc-sr">Catalog tables</caption>
            <thead>
              <tr>
                <th>Table</th>
                <th>Layer</th>
                <th>Dataset</th>
                <th>Rows</th>
              </tr>
            </thead>
            <tbody>
              {tables.data?.map((table) => (
                <tr key={table.id}>
                  <td>{table.displayName || table.name}</td>
                  <td>{table.layer}</td>
                  <td>{table.dataset || '—'}</td>
                  <td className="pc-num">{table.rowCount == null ? '—' : table.rowCount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function MetadataView() {
  const datasets = useMetadataDatasets();
  const [name, setName] = useState<string | null>(null);
  const dictionary = useMetadataDictionary();
  const selected = name ?? datasets.data?.[0]?.name ?? null;
  const activeSchema = useMetadataSchema(selected);
  return (
    <div>
      <PageHeader
        title="Metadata Catalog"
        description="Dataset schemas and the column dictionary already published by the metadata API."
        productionHref="/metadata"
      />
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 320, marginBottom: 12, fontSize: 12, fontWeight: 700 }}>
        Dataset
        <select className="pc-field" value={selected ?? ''} onChange={(event) => setName(event.target.value)}>
          {(datasets.data ?? []).map((dataset) => (
            <option key={dataset.name} value={dataset.name}>{dataset.name}</option>
          ))}
        </select>
      </label>
      {activeSchema.isLoading && <LoadingRows />}
      {activeSchema.data && <SchemaViewer name={activeSchema.data.name} columns={activeSchema.data.columns} />}
      {activeSchema.isError && <StateBlock tone="error" title="Schema could not be loaded" />}
      <section className="pc-card">
        <div className="pc-card-h"><h2>Column dictionary</h2></div>
        <div className="pc-card-b">
          {dictionary.isLoading && <LoadingRows />}
          {(dictionary.data ?? []).length === 0 && !dictionary.isLoading && <p className="pc-gap">No dictionary entries.</p>}
          <ul>
            {(dictionary.data ?? []).slice(0, 40).map((entry, index) => (
              <li key={index}>{isRecord(entry) ? displayValue(entry.name ?? entry.column ?? entry) : displayValue(entry)}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

export function GovernanceView() {
  const lineage = useQuery({
    queryKey: queryKeys.governanceLineage(),
    queryFn: async () => (await getGovernanceLineage()).paths,
  });
  const audit = useQuery({
    queryKey: queryKeys.governanceAudit(),
    queryFn: async () => (await getGovernanceAudit()).audit,
  });
  const policies = useQuery({
    queryKey: ['governance', 'policies'],
    queryFn: getGovernancePolicies,
  });
  return (
    <div>
      <PageHeader title="Governance" description="Audit events, declared lineage paths, and policies from the governance API." productionHref="/governance" />
      {lineage.isError && <StateBlock tone="error" title="Lineage paths could not be loaded">{errorText(lineage.error)}</StateBlock>}
      <section className="pc-card">
        <div className="pc-card-h"><h2>Lineage paths</h2></div>
        <div className="pc-card-b">
          {(lineage.data ?? []).length === 0 && !lineage.isLoading && <p className="pc-gap">No lineage paths returned.</p>}
          <ul>
            {(lineage.data ?? []).map((path, index) => (
              <li key={index}>{path.metric}: {path.source} → {path.bronze} → {path.silver} → {path.gold}</li>
            ))}
          </ul>
        </div>
      </section>
      <section className="pc-card">
        <div className="pc-card-h"><h2>Audit</h2></div>
        <div className="pc-card-b">
          {(audit.data ?? []).length === 0 && !audit.isLoading && <StateBlock tone="empty" title="No audit events" />}
          <ul>
            {(audit.data ?? []).slice(0, 30).map((entry, index) => (
              <li key={index}>{entry.event || 'Event'} · {entry.run_id} · {entry.refreshed_at || '—'}</li>
            ))}
          </ul>
        </div>
      </section>
      <section className="pc-card">
        <div className="pc-card-h"><h2>Policies</h2></div>
        <div className="pc-card-b">
          {(policies.data?.policies ?? []).length === 0 && <p className="pc-gap">No policies returned.</p>}
          <ul>
            {(policies.data?.policies ?? []).map((policy, index) => (
              <li key={index}>{displayValue(policy)}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

export function LineageView() {
  const graph = useQuery({
    queryKey: queryKeys.lineageGraph({ mode: 'latest' }),
    queryFn: () => getLineageGraph({ mode: 'latest' }),
  });
  return (
    <div>
      <PageHeader
        title="Lineage"
        description="Latest lineage graph from the existing graph API. Run-scoped filters and diagram export stay on the current lineage screen."
        productionHref="/lineage"
      />
      <LineageLegend />
      {graph.isLoading && <LoadingRows />}
      {graph.isError && <StateBlock tone="error" title="Lineage graph could not be loaded">{errorText(graph.error)}</StateBlock>}
      {graph.data && (
        <div style={{ height: 520, marginTop: 12 }}>
          <LineageGraph nodesPayload={graph.data.nodes} edgesPayload={graph.data.edges} />
        </div>
      )}
    </div>
  );
}

export function ArchitectureView() {
  return (
    <div>
      <PageHeader
        title="Architecture"
        description="Medallion flow and lineage diagram used by the current architecture screen. SVG and PNG export remain on that screen."
        productionHref="/architecture"
      />
      <section className="pc-card">
        <div className="pc-card-h"><h2>Medallion flow</h2></div>
        <div className="pc-card-b"><MermaidDiagram chart={MEDALLION_DIAGRAM} id="preview-medallion" /></div>
      </section>
      <section className="pc-card">
        <div className="pc-card-h"><h2>Lineage diagram</h2></div>
        <div className="pc-card-b"><MermaidDiagram chart={LINEAGE_DIAGRAM} id="preview-lineage" /></div>
      </section>
    </div>
  );
}

export function ObservabilityView() {
  const pipeline = useQuery({
    queryKey: queryKeys.metricsPipeline(10),
    queryFn: () => getMetricsPipeline(10),
  });
  const geocode = useMetricsGeocode();
  const methods = useQuery({
    queryKey: queryKeys.metricsExtraction(),
    queryFn: getMetricsExtractionMethods,
  });
  return (
    <div>
      <PageHeader title="Observability" description="Pipeline stage metrics, extraction methods, and geocode coverage." productionHref="/metrics" />
      {pipeline.isError && <StateBlock tone="error" title="Pipeline metrics could not be loaded">{errorText(pipeline.error)}</StateBlock>}
      <div className="pc-table-wrap">
        <table className="pc-table">
          <caption className="pc-sr">Pipeline stage metrics</caption>
          <thead>
            <tr>
              <th>Stage</th>
              <th>Status</th>
              <th>Output</th>
              <th>Errors</th>
              <th>Duration ms</th>
            </tr>
          </thead>
          <tbody>
            {(pipeline.data?.stages ?? []).map((stage, index) => (
              <tr key={`${stage.run_id}-${stage.stage_name}-${index}`}>
                <td>{stage.stage_name}</td>
                <td>{stage.status}</td>
                <td className="pc-num">{stage.output_count == null ? '—' : stage.output_count.toLocaleString()}</td>
                <td className="pc-num">{stage.error_count == null ? '—' : stage.error_count.toLocaleString()}</td>
                <td className="pc-num">{stage.duration_ms == null ? '—' : stage.duration_ms.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(pipeline.data?.stages ?? []).length === 0 && !pipeline.isLoading && <StateBlock tone="empty" title="No stage metrics yet" />}
      <p className="pc-gap">
        Geocode coverage {geocode.data?.total_latest ? `${geocode.data.geocode_coverage_pct ?? '—'}% of ${geocode.data.total_latest}` : 'not published'}.
      </p>
      <ul>
        {(methods.data ?? []).slice(0, 20).map((method, index) => (
          <li key={index}>{displayValue(method)}</li>
        ))}
      </ul>
    </div>
  );
}

const API_GROUPS = [
  { title: 'Health', items: [{ method: 'GET', path: '/v1/healthz' }, { method: 'GET', path: '/v1/health' }] },
  { title: 'Latest data', items: [{ method: 'GET', path: '/v1/latest/discos' }, { method: 'GET', path: '/v1/latest/commitments' }, { method: 'GET', path: '/v1/latest/map-points' }] },
  { title: 'Runs', items: [{ method: 'GET', path: '/v1/runs' }, { method: 'POST', path: '/v1/runs' }] },
  { title: 'Downloads', items: [{ method: 'GET', path: '/v1/exports/latest/commitments.csv' }, { method: 'GET', path: '/v1/exports/latest/commitments.parquet' }, { method: 'GET', path: '/v1/exports/latest/map.geojson' }] },
];

export function ApisView() {
  const { filters } = useGlobalFilters();
  const [url, setUrl] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const exportParams = {
    disco: filters.disco || undefined,
    year: filters.year ?? undefined,
    month: filters.month || undefined,
    band: filters.band || undefined,
  };
  const send = async () => {
    if (!url.trim()) return;
    setResult('Loading…');
    try {
      const response = await fetch(url, { method: 'GET' });
      const text = await response.text();
      setResult(`GET ${response.status}\n${text.slice(0, 2000)}`);
    } catch (error) {
      setResult(errorText(error));
    }
  };
  return (
    <div>
      <PageHeader title="APIs & Downloads" description="Read-only try-it sends GET. Pipeline writes stay on the operations control panel." productionHref="/api-docs" />
      {API_GROUPS.map((group) => (
        <section key={group.title} className="pc-card">
          <div className="pc-card-h"><h2>{group.title}</h2></div>
          <ul>
            {group.items.map((item) => (
              <li key={item.path}><strong>{item.method}</strong> <code>{item.path}</code></li>
            ))}
          </ul>
        </section>
      ))}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <input className="pc-field" style={{ flex: 1, minWidth: 220 }} value={url} onChange={(event) => setUrl(event.target.value)} placeholder={endpoints.latestDiscos()} aria-label="GET URL" />
        <button type="button" className="pc-btn pc-btn-primary" onClick={send}>Send GET</button>
      </div>
      {result && <pre className="pc-gap" style={{ whiteSpace: 'pre-wrap' }}>{result}</pre>}
      <ul>
        <li><a href={getExportCommitmentsCsvUrl(exportParams)}>CSV — latest snapshot, DisCo / year / month / band. Search is not applied.</a></li>
        <li><a href={getExportCommitmentsParquetUrl(exportParams)}>Parquet — same scope. Current API returns HTTP 501.</a></li>
        <li><a href={getExportMapGeojsonUrl(exportParams)}>GeoJSON map points — DisCo / year / month / band. Unmapped rows are not included.</a></li>
      </ul>
      <GapNote>Authenticated API-key onboarding is not implemented. The current screen says the same.</GapNote>
    </div>
  );
}

export function CoverageView() {
  return (
    <div>
      <PageHeader
        title="Capability map"
        description="Every workspace screen in this console. The endpoint matrix is on this same page."
      />
      <div className="pc-table-wrap">
        <table className="pc-table">
          <caption className="pc-sr">Console routes</caption>
          <thead>
            <tr>
              <th>Capability</th>
              <th>Workspace</th>
              <th>Route</th>
            </tr>
          </thead>
          <tbody>
            {FEATURE_INVENTORY.map((item) => (
              <tr key={item.id}>
                <td>{item.label}</td>
                <td>{item.group}</td>
                <td>{item.production ? <Link href={item.production}>{item.production}</Link> : item.productionNote}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
