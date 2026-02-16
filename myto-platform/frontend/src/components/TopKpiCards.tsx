'use client';

import { useEffect, useState } from 'react';

export default function TopKpiCards() {
  const [dq, setDq] = useState<{ dq_score?: number }>({});
  const [geo, setGeo] = useState<{ geocode_coverage_pct?: number; total_latest?: number }>({});
  const [audit, setAudit] = useState<{ audit?: { refreshed_at: string | null }[] }>({});
  useEffect(() => {
    fetch('/api/v1/dq/summary').then((r) => r.json()).then(setDq).catch(() => {});
    fetch('/api/v1/metrics/geocode').then((r) => r.json()).then(setGeo).catch(() => {});
    fetch('/api/v1/governance/audit').then((r) => r.json()).then(setAudit).catch(() => {});
  }, []);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
      <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: '1rem' }}>
        <div style={{ color: '#8b949e', fontSize: '0.85rem' }}>DQ Score</div>
        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{dq.dq_score ?? '—'}</div>
      </div>
      <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: '1rem' }}>
        <div style={{ color: '#8b949e', fontSize: '0.85rem' }}>Geocode coverage</div>
        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{geo.geocode_coverage_pct ?? '—'}%</div>
      </div>
      <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: '1rem' }}>
        <div style={{ color: '#8b949e', fontSize: '0.85rem' }}>Latest records</div>
        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{geo.total_latest ?? '—'}</div>
      </div>
      <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: '1rem' }}>
        <div style={{ color: '#8b949e', fontSize: '0.85rem' }}>Last refreshed</div>
        <div style={{ fontSize: '0.9rem' }}>{audit.audit?.[0]?.refreshed_at ?? '—'}</div>
      </div>
    </div>
  );
}
