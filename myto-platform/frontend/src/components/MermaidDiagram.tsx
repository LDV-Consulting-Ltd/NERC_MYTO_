'use client';

import { useEffect, useRef, useState } from 'react';

interface MermaidDiagramProps {
  chart: string;
  id?: string;
  className?: string;
  /** Called with the rendered SVG string when ready (e.g. for Download SVG/PNG). */
  onSvgRendered?: (svg: string) => void;
}

export default function MermaidDiagram({ chart, id: idProp, className = '', onSvgRendered }: MermaidDiagramProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const id = idProp ?? `mermaid-${Math.random().toString(36).slice(2, 9)}`;

  const chartTrimmed = typeof chart === 'string' ? chart.trim() : '';

  useEffect(() => {
    if (!chartTrimmed || !ref.current) return;
    let cancelled = false;
    setError(null);
    import('mermaid').then((mermaidModule) => {
      if (cancelled) return;
      const mermaid = mermaidModule.default;
      mermaid.initialize({
        startOnLoad: false,
        theme: 'base',
        securityLevel: 'strict',
        flowchart: { curve: 'basis' },
      });
      mermaid
        .render(id, chartTrimmed)
        .then(({ svg: s }) => {
          if (!cancelled) {
            setSvg(s);
            onSvgRendered?.(s);
          }
        })
        .catch((err: Error) => {
          if (!cancelled) {
            const msg = err?.message ?? String(err);
            setError(msg.replace(/\s*mermaid version [\d.]+\.?\s*/i, ' ').trim() || 'Diagram failed to render.');
          }
        });
    });
    return () => {
      cancelled = true;
    };
  }, [chartTrimmed, id, onSvgRendered]);

  if (!chartTrimmed) return <div className={`min-h-[120px] flex items-center justify-center text-[var(--ldv-text-muted)] text-sm ${className}`}>No diagram defined.</div>;
  if (error) return <pre className="p-3 bg-red-50 text-red-800 rounded text-sm overflow-auto">{error}</pre>;
  if (!svg) return <div ref={ref} className={`min-h-[200px] flex items-center justify-center text-[var(--ldv-text-muted)] ${className}`}>Rendering…</div>;
  return <div ref={ref} className={className} dangerouslySetInnerHTML={{ __html: svg }} />;
}
