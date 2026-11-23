'use client';

import { useState, useCallback } from 'react';
import { useMetadataDatasets } from '@/lib/hooks';
import MermaidDiagram from '@/components/MermaidDiagram';
import { MEDALLION_DIAGRAM, LINEAGE_DIAGRAM } from '@/lib/diagrams';

function downloadSvg(svg: string, filename: string) {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.svg') ? filename : `${filename}.svg`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadPng(svg: string, filename: string) {
  const img = new Image();
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      URL.revokeObjectURL(url);
      return;
    }
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const u = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = u;
      a.download = filename.endsWith('.png') ? filename : `${filename}.png`;
      a.click();
      URL.revokeObjectURL(u);
    }, 'image/png');
  };
  img.onerror = () => URL.revokeObjectURL(url);
  img.src = url;
}

export default function ArchitecturePage() {
  const [copyId, setCopyId] = useState<string | null>(null);
  const [animateLineage, setAnimateLineage] = useState(true);
  const [medallionSvg, setMedallionSvg] = useState<string | null>(null);
  const [lineageSvg, setLineageSvg] = useState<string | null>(null);

  const { data: datasets = [] } = useMetadataDatasets();

  const copyMermaid = (chart: string, id: string) => {
    navigator.clipboard.writeText(chart);
    setCopyId(id);
    setTimeout(() => setCopyId(null), 2000);
  };

  const byLayer = datasets.reduce<Record<string, typeof datasets>>((acc, d) => {
    const layer = d.layer || 'other';
    if (!acc[layer]) acc[layer] = [];
    acc[layer].push(d);
    return acc;
  }, {});

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--ldv-primary)] tracking-tight mb-2">Architecture & Data Flow</h1>
      <p className="text-sm text-[var(--ldv-text-muted)] mb-4">
        Medallion architecture, animated lineage, and physical tables by schema.
      </p>

      {/* 1) Medallion Architecture Diagram */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-primary mb-2">1) Medallion Architecture Diagram</h2>
        <p className="text-sm text-[var(--ldv-text-muted)] mb-2">
          Pipeline stages (Discover → … → Promote Latest) and schemas: bronze, silver, gold, latest.
        </p>
        <div className="border border-[var(--ldv-border)] rounded-lg p-4 bg-white overflow-auto">
          <MermaidDiagram
            chart={MEDALLION_DIAGRAM}
            id="medallion-arch"
            className="min-h-[400px]"
            onSvgRendered={useCallback((svg) => setMedallionSvg(svg), [])}
          />
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => copyMermaid(MEDALLION_DIAGRAM, 'medallion')}
          >
            {copyId === 'medallion' ? 'Copied!' : 'Copy Mermaid'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => medallionSvg && downloadSvg(medallionSvg, 'medallion-architecture.svg')}
            disabled={!medallionSvg}
          >
            Download SVG
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => medallionSvg && downloadPng(medallionSvg, 'medallion-architecture.png')}
            disabled={!medallionSvg}
          >
            Download PNG
          </button>
        </div>
      </section>

      {/* 2) Lineage Diagram (animated edges) */}
      <section className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <h2 className="text-lg font-semibold text-primary">2) Lineage Diagram</h2>
          <label className="flex items-center gap-2 text-sm text-[var(--ldv-text-muted)] cursor-pointer">
            <input
              type="checkbox"
              checked={animateLineage}
              onChange={(e) => setAnimateLineage(e.target.checked)}
              className="rounded border-[var(--ldv-border)]"
            />
            Show animated lineage
          </label>
        </div>
        <p className="text-sm text-[var(--ldv-text-muted)] mb-2">
          End-to-end flow: source pages/PDF → bronze → silver → gold → latest → APIs → Map/Explorer.
        </p>
        <div
          className={`border border-[var(--ldv-border)] rounded-lg p-4 bg-white overflow-auto ${animateLineage ? 'animate-lineage' : ''}`}
        >
          <MermaidDiagram
            chart={LINEAGE_DIAGRAM}
            id="lineage-diag"
            className="min-h-[300px]"
            onSvgRendered={useCallback((svg) => setLineageSvg(svg), [])}
          />
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => copyMermaid(LINEAGE_DIAGRAM, 'lineage')}
          >
            {copyId === 'lineage' ? 'Copied!' : 'Copy Mermaid'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => lineageSvg && downloadSvg(lineageSvg, 'lineage.svg')}
            disabled={!lineageSvg}
          >
            Download SVG
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => lineageSvg && downloadPng(lineageSvg, 'lineage.png')}
            disabled={!lineageSvg}
          >
            Download PNG
          </button>
        </div>
      </section>

      {/* Physical tables */}
      <section>
        <h2 className="text-lg font-semibold text-primary mb-2">Physical tables</h2>
        <p className="text-sm text-[var(--ldv-text-muted)] mb-3">Grouped by schema (from metadata/datasets).</p>
        {['bronze', 'silver', 'gold'].map((layer) => (
          <div key={layer} className="mb-4">
            <h3 className="font-medium text-primary capitalize mb-2">{layer}</h3>
            <ul className="list-disc pl-6 text-sm space-y-0.5">
              {(byLayer[layer] ?? []).length ? (
                (byLayer[layer] ?? []).map((d) => (
                  <li key={d.name}>
                    <span className="font-mono">{d.name}</span>
                    {d.description && (
                      <span className="text-[var(--ldv-text-muted)] ml-2">— {d.description}</span>
                    )}
                  </li>
                ))
              ) : (
                <li className="text-[var(--ldv-text-muted)]">No datasets</li>
              )}
            </ul>
          </div>
        ))}
        <h3 className="font-medium text-primary mb-2">Latest snapshot</h3>
        <ul className="list-disc pl-6 text-sm space-y-0.5">
          {(byLayer['latest'] ?? []).length ? (
            (byLayer['latest'] ?? []).map((d) => (
              <li key={d.name}>
                <span className="font-mono">{d.name}</span>
              </li>
            ))
          ) : datasets.some((d) => d.name?.includes('latest')) ? (
            datasets
              .filter((d) => d.name?.includes('latest'))
              .map((d) => (
                <li key={d.name}>
                  <span className="font-mono">{d.name}</span>
                </li>
              ))
          ) : (
            <li className="text-[var(--ldv-text-muted)]">No latest tables listed</li>
          )}
        </ul>
      </section>
    </div>
  );
}
