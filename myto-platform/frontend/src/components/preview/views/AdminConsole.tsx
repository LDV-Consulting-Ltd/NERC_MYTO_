'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ADMIN_MODE } from '@/lib/constants';
import { usePreviewHref } from '../useConsoleData';
import { PageHeader, StateBlock, StatusPill } from '../ui';

const ACTIONS = [
  {
    id: 'manual_geocode_override',
    title: 'Manual geocode override',
    body: 'Set latitude and longitude for a location. The current Admin screen records a local confirmation only.',
  },
  {
    id: 'merge_split_feeder',
    title: 'Merge or split feeder',
    body: 'Merge or split feeder records. The backend routes are stubs.',
  },
  {
    id: 're-promote_run',
    title: 'Re-promote a run',
    body: 'Point the latest snapshot at a specific run. This screen does not call the promote endpoint.',
  },
];

export default function AdminConsole() {
  const href = usePreviewHref();
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  return (
    <div>
      <PageHeader
        title="Admin"
        description="Overrides and maintenance. Confirmations stay on this screen and do not call override endpoints."
        productionHref="/admin"
        actions={<StatusPill tone={ADMIN_MODE ? 'warn' : 'neutral'}>{ADMIN_MODE ? 'NEXT_PUBLIC_ADMIN_MODE is true' : 'NEXT_PUBLIC_ADMIN_MODE is not set'}</StatusPill>}
      />
      <StateBlock tone="partial" title="Permission boundary">
        The current Admin page is available from the sidebar without an additional frontend gate. <code>NEXT_PUBLIC_ADMIN_MODE</code> is defined and unused by the existing screens, so Admin is not hidden behind a new check. Confirmations stay local. Nothing here writes to the database.
      </StateBlock>
      {ACTIONS.map((action) => (
        <section key={action.id} className="pc-card">
          <div className="pc-card-h"><h2>{action.title}</h2></div>
          <div className="pc-card-b">
            <p className="pc-lede">{action.body}</p>
            <button type="button" className="pc-btn" onClick={() => setPending(action.id)}>
              Review action
            </button>
          </div>
        </section>
      ))}
      {message && <p className="pc-gap" role="status">{message}</p>}
      <p className="pc-gap">
        Pipeline start and reconcile stay on the <Link href={href('/operations')}>control panel</Link>, matching Pipeline Operations.
      </p>
      {pending && (
        <div className="pc-detail" style={{ position: 'fixed', inset: 'auto 16px 16px auto', zIndex: 60, width: 360 }} role="dialog" aria-modal="true" aria-labelledby="admin-confirm-title">
          <div className="pc-detail-bar">
            <h2 id="admin-confirm-title">Confirm</h2>
          </div>
          <p className="pc-detail-note">
            This action will be noted locally as an audit intention. The backend override is not called.
          </p>
          <div style={{ display: 'flex', gap: 8, padding: 12 }}>
            <button
              type="button"
              className="pc-btn pc-btn-primary"
              onClick={() => {
                setMessage(`Audit log would record: ${pending}. Backend /v1/admin/overrides/* is not called from this screen.`);
                setPending(null);
              }}
            >
              Confirm
            </button>
            <button type="button" className="pc-btn" onClick={() => setPending(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
