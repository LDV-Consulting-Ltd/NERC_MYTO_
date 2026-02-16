'use client';

import { useEffect, useState } from 'react';
import { getGovernanceAudit } from '@/lib/api';

interface PageShellProps {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export default function PageShell({ title, children, actions }: PageShellProps) {
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);

  useEffect(() => {
    getGovernanceAudit()
      .then((r) => {
        if (r.audit?.[0]) {
          setRefreshedAt(r.audit[0].refreshed_at ?? null);
          setRunId(r.audit[0].run_id ?? null);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="page-shell">
      <div className="page-header">
        <h1 className="page-title">{title}</h1>
        {actions && <div className="page-actions">{actions}</div>}
      </div>
      <div className="page-meta">
        <span>Last refreshed: {refreshedAt ? new Date(refreshedAt).toLocaleString() : '—'}</span>
        <span>Active snapshot: <code>{runId ? `${runId.slice(0, 8)}…` : '—'}</code></span>
        <span className="chip success">Snapshot</span>
      </div>
      <div className="page-content">{children}</div>
    </div>
  );
}
