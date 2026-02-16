'use client';

import { useState } from 'react';
import PageShell from '@/components/PageShell';

export default function AdminPage() {
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [overrideMessage, setOverrideMessage] = useState('');

  const handleOverride = (action: string) => {
    setConfirmAction(action);
  };

  const confirm = () => {
    if (confirmAction) {
      setOverrideMessage(`Audit log would record: ${confirmAction}. Backend /v1/admin/overrides/* not implemented.`);
      setConfirmAction(null);
    }
  };

  const cancel = () => {
    setConfirmAction(null);
  };

  return (
    <PageShell title="Admin (Overrides & maintenance)">
      <div className="card" style={{ borderColor: '#da3633', marginBottom: '1.5rem' }}>
        <p style={{ color: '#f85149', fontWeight: 600 }}>Admin section: overrides and maintenance only. All actions are audited.</p>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>Manual geocode override</h2>
        <p style={{ fontSize: '12px', color: '#8b949e', marginBottom: '0.5rem' }}>Set lat/lon for a location (writes audit log).</p>
        <button type="button" onClick={() => handleOverride('manual_geocode_override')}>
          Open override (requires confirmation)
        </button>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>Merge / Split feeder</h2>
        <p style={{ fontSize: '12px', color: '#8b949e', marginBottom: '0.5rem' }}>Merge or split feeder records (writes audit log).</p>
        <button type="button" onClick={() => handleOverride('merge_split_feeder')}>
          Open merge/split (requires confirmation)
        </button>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>Re-promote a run</h2>
        <p style={{ fontSize: '12px', color: '#8b949e', marginBottom: '0.5rem' }}>Set latest snapshot to a specific run_id (audit logged).</p>
        <button type="button" onClick={() => handleOverride('re-promote_run')}>
          Re-promote run (requires confirmation)
        </button>
      </div>

      {overrideMessage && (
        <div className="card" style={{ background: '#21262d' }}>
          <p style={{ margin: 0 }}>{overrideMessage}</p>
        </div>
      )}

      {confirmAction && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
        }}
        >
          <div className="card" style={{ maxWidth: 400 }}>
            <h3 style={{ margin: '0 0 0.5rem', color: '#f85149' }}>Confirm</h3>
            <p>This action will be audit logged. Continue?</p>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button type="button" className="primary" onClick={confirm}>Confirm</button>
              <button type="button" onClick={cancel}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
