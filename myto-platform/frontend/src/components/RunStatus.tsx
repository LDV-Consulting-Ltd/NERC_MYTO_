'use client';

import Link from 'next/link';

interface Run {
  run_id: string;
  status: string;
  started_at: string;
}

export default function RunStatus({ runs, loading }: { runs: Run[]; loading: boolean }) {
  if (loading) return <p>Loading runs…</p>;
  if (!runs.length) return <p>No runs yet. Start a run from Data Engineering.</p>;
  return (
    <div>
      <h2 style={{ marginBottom: '0.5rem' }}>Recent runs</h2>
      <table>
        <thead>
          <tr>
            <th>Run ID</th>
            <th>Status</th>
            <th>Started</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => (
            <tr key={r.run_id}>
              <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{r.run_id.slice(0, 8)}…</td>
              <td><span style={{ color: r.status === 'success' ? '#3fb950' : r.status === 'failed' ? '#f85149' : '#d29922' }}>{r.status}</span></td>
              <td>{new Date(r.started_at).toLocaleString()}</td>
              <td><Link href={`/runs/${r.run_id}`}>Detail</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
