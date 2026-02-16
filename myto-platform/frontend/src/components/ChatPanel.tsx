'use client';

import { useState } from 'react';

export default function ChatPanel() {
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState<{ answer: string; sources?: string[]; sql_suggestion?: string | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const send = () => {
    if (!message.trim()) return;
    setLoading(true);
    setReply(null);
    fetch('/api/v1/agent/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: message.trim() }),
    })
      .then((r) => r.json())
      .then(setReply)
      .catch(() => setReply({ answer: 'Request failed.' }))
      .finally(() => setLoading(false));
  };
  return (
    <div style={{ marginTop: '1rem' }}>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Ask about datasets, DQ, pipeline..."
        rows={2}
        style={{ width: '100%', maxWidth: 500, padding: '0.5rem', background: '#161b22', border: '1px solid #30363d', color: '#e6edf3', borderRadius: 6 }}
      />
      <button onClick={send} disabled={loading} style={{ display: 'block', marginTop: '0.5rem', padding: '0.5rem 1rem' }}>
        {loading ? '…' : 'Send'}
      </button>
      {reply && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: '#161b22', borderRadius: 8, border: '1px solid #30363d' }}>
          <div>{reply.answer}</div>
          {reply.sources?.length ? <div style={{ fontSize: '0.85rem', color: '#8b949e', marginTop: '0.5rem' }}>Sources: {reply.sources.join(', ')}</div> : null}
          {reply.sql_suggestion && <pre style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>{reply.sql_suggestion}</pre> : null}
        </div>
      )}
    </div>
  );
}
