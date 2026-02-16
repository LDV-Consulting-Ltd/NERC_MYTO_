'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { getLineageGraph, getCatalogTables } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import LineageGraph, { LineageLegend } from '@/components/LineageGraph';
import { PRODUCT_NAME } from '@/lib/constants';

export default function LineageExplorerPage() {
  const [mode, setMode] = useState<'latest' | 'run'>('latest');
  const [runId, setRunId] = useState('');
  const [datasetFilter, setDatasetFilter] = useState('');
  const [layerFilter, setLayerFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [tableDetailId, setTableDetailId] = useState<string | null>(null);

  const params = useMemo(() => ({
    mode,
    run_id: mode === 'run' && runId ? runId : undefined,
    dataset: datasetFilter || undefined,
    layer: layerFilter || undefined,
  }), [mode, runId, datasetFilter, layerFilter]);

  const { data: graphData, isLoading, error } = useQuery({
    queryKey: queryKeys.lineageGraph(params),
    queryFn: () => getLineageGraph(params),
    staleTime: 2 * 60 * 1000,
  });

  const { data: catalogTables = [] } = useQuery({
    queryKey: queryKeys.catalogTables({ layer: layerFilter || undefined, dataset: datasetFilter || undefined }),
    queryFn: () => getCatalogTables({ layer: layerFilter || undefined, dataset: datasetFilter || undefined }),
    staleTime: 5 * 60 * 1000,
  });

  const datasetOptions = useMemo(() => {
    const set = new Set<string>();
    catalogTables.forEach((t) => { if (t.dataset) set.add(t.dataset); });
    return Array.from(set).sort();
  }, [catalogTables]);

  const nodes = graphData?.nodes ?? [];
  const edges = graphData?.edges ?? [];
  const filteredNodes = useMemo(() => {
    if (!search.trim()) return nodes;
    const q = search.trim().toLowerCase();
    return nodes.filter((n) => n.id.toLowerCase().includes(q) || (n.displayName && n.displayName.toLowerCase().includes(q)));
  }, [nodes, search]);
  const filteredEdgeIds = useMemo(() => {
    const idSet = new Set(filteredNodes.map((n) => n.id));
    return new Set(edges.filter((e) => idSet.has(e.source) && idSet.has(e.target)).map((e) => e.id));
  }, [filteredNodes, edges]);
  const filteredEdges = useMemo(() => edges.filter((e) => filteredEdgeIds.has(e.id)), [edges, filteredEdgeIds]);

  const onNodeClick = useCallback((nodeId: string) => {
    setTableDetailId(nodeId);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--ldv-primary)] tracking-tight mb-1">
        {PRODUCT_NAME} / Lineage Explorer
      </h1>
      <p className="text-sm text-[var(--ldv-text-muted)] mb-4">
        Full ETL lineage: sources → bronze → silver → warehouse (from catalog).
      </p>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 mb-4 p-3 rounded-lg border border-[var(--ldv-border)] bg-[var(--ldv-surface)]/50">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--ldv-text-muted)]">Mode</span>
          <button
            type="button"
            className={`px-2 py-1 rounded text-sm font-medium ${mode === 'latest' ? 'bg-[var(--ldv-primary)] text-white' : 'bg-white border border-[var(--ldv-border)]'}`}
            onClick={() => setMode('latest')}
          >
            Latest
          </button>
          <button
            type="button"
            className={`px-2 py-1 rounded text-sm font-medium ${mode === 'run' ? 'bg-[var(--ldv-primary)] text-white' : 'bg-white border border-[var(--ldv-border)]'}`}
            onClick={() => setMode('run')}
          >
            By Run
          </button>
        </div>
        {mode === 'run' && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-[var(--ldv-text-muted)]">Run ID</label>
            <input
              type="text"
              value={runId}
              onChange={(e) => setRunId(e.target.value)}
              placeholder="optional"
              className="border border-[var(--ldv-border)] rounded px-2 py-1 w-48 text-sm font-mono"
            />
          </div>
        )}
        <div className="flex items-center gap-2">
          <label className="text-sm text-[var(--ldv-text-muted)]">Dataset</label>
          <select
            value={datasetFilter}
            onChange={(e) => setDatasetFilter(e.target.value)}
            className="border border-[var(--ldv-border)] rounded px-2 py-1 text-sm"
          >
            <option value="">All</option>
            {datasetOptions.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--ldv-text-muted)]">Layer</span>
          {['source', 'bronze', 'silver', 'gold'].map((l) => (
            <button
              key={l}
              type="button"
              className={`px-2 py-1 rounded text-sm capitalize ${layerFilter === l ? 'bg-[var(--ldv-primary)] text-white' : 'bg-white border border-[var(--ldv-border)]'}`}
              onClick={() => setLayerFilter(layerFilter === l ? '' : l)}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-[var(--ldv-text-muted)]">Search table</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Highlight table..."
            className="border border-[var(--ldv-border)] rounded px-2 py-1 w-48 text-sm"
          />
        </div>
      </div>

      {/* Graph card */}
      <div className="border border-[var(--ldv-border)] rounded-lg p-4 bg-white shadow-sm mb-4">
        <h2 className="font-semibold text-[var(--ldv-primary)] mb-2">Lineage graph</h2>
        <p className="text-xs text-[var(--ldv-text-muted)] mb-3">Click node to open table.</p>
        {isLoading && <p className="text-sm text-[var(--ldv-text-muted)] py-8">Loading graph…</p>}
        {error && (
          <p className="text-sm text-red-600 py-4">
            Failed to load lineage: {(error as Error).message}
          </p>
        )}
        {!isLoading && !error && (
          <LineageGraph
            nodesPayload={search.trim() ? filteredNodes : nodes}
            edgesPayload={search.trim() ? filteredEdges : edges}
            onNodeClick={onNodeClick}
            highlightNodeId={search.trim() ? (filteredNodes[0]?.id ?? null) : null}
          />
        )}
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <LineageLegend />
        </div>
      </div>

      {/* Links */}
      <div className="flex flex-wrap gap-4 text-sm">
        <Link href="/architecture" className="text-[var(--ldv-support)] hover:underline">
          Open ETL / Data Model diagrams
        </Link>
        <Link href="/layers/gold" className="text-[var(--ldv-support)] hover:underline">
          Warehouse tables
        </Link>
        <Link href="/metadata" className="text-[var(--ldv-support)] hover:underline">
          Metadata catalog
        </Link>
      </div>

      {/* Table detail modal (simple) */}
      {tableDetailId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setTableDetailId(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white rounded-lg shadow-lg p-4 max-w-md w-full border border-[var(--ldv-border)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-[var(--ldv-primary)] mb-2">Table</h3>
            <p className="font-mono text-sm break-all mb-3">{tableDetailId}</p>
            <Link
              href={`/metadata?dataset=${encodeURIComponent(tableDetailId)}`}
              className="text-sm text-[var(--ldv-support)] hover:underline"
            >
              View in Metadata catalog →
            </Link>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className="btn-secondary text-sm"
                onClick={() => setTableDetailId(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
