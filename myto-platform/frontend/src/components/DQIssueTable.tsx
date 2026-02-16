'use client';

interface Issue {
  record_id: string;
  dq_status: string;
  dq_reasons: unknown;
}

export default function DQIssueTable({ issues }: { issues: Issue[] }) {
  if (!issues.length) return <p style={{ color: '#8b949e' }}>No failing records.</p>;
  return (
    <table>
      <thead>
        <tr><th>Record ID</th><th>Status</th><th>Reasons</th></tr>
      </thead>
      <tbody>
        {issues.map((i) => (
          <tr key={i.record_id}>
            <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{i.record_id.slice(0, 60)}…</td>
            <td>{i.dq_status}</td>
            <td>{Array.isArray(i.dq_reasons) ? i.dq_reasons.join(', ') : JSON.stringify(i.dq_reasons)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
