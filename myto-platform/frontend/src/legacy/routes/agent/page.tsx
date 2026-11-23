'use client';

import { useState, Suspense } from 'react';
import { useSnapshotMeta, useGlobalFilters } from '@/lib/hooks';
import { agentChat } from '@/lib/api';
import type { AgentResponse } from '@/lib/types';

function AgentPageContent() {
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState<AgentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const { data: meta } = useSnapshotMeta();
  const { filters } = useGlobalFilters();

  const send = () => {
    if (!message.trim()) return;
    setLoading(true);
    setReply(null);
    agentChat(message.trim(), 'latest', meta?.run_id ?? undefined, filters.disco || undefined)
      .then(setReply)
      .catch(() => setReply({ answer: 'Request failed.' }))
      .finally(() => setLoading(false));
  };

  const apiUrl = reply?.api_url_suggestions?.[0];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--ldv-primary)] tracking-tight mb-2">Regulatory Intelligence Agent</h1>
      <p className="text-sm text-[var(--ldv-text-muted)] mb-4">
        Ask about datasets, definitions, and pipeline. Answers use metadata; suggests API calls and SQL.
      </p>
      <div className="mb-4">
        <span className="text-xs text-[var(--ldv-text-muted)] mr-2">Context:</span>
        <span className="inline-block px-2 py-0.5 rounded bg-surface text-sm border border-[var(--ldv-border)]">
          Latest snapshot {meta?.run_id ? `(${String(meta.run_id).slice(0, 8)}…)` : ''}
        </span>
        {filters.disco && (
          <span className="ml-2 inline-block px-2 py-0.5 rounded bg-surface text-sm border border-[var(--ldv-border)]">
            Disco: {filters.disco}
          </span>
        )}
      </div>
      <div className="mb-4">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask e.g. What datasets exist? What is min_supply_hours?"
          rows={3}
          className="w-full max-w-xl border border-[var(--ldv-border)] rounded px-3 py-2 text-sm"
        />
        <button
          type="button"
          className="btn-primary mt-2"
          onClick={send}
          disabled={loading}
        >
          {loading ? '…' : 'Send'}
        </button>
      </div>
      {reply && (
        <div className="border border-[var(--ldv-border)] rounded-lg p-4 bg-surface/50 max-w-2xl">
          <div className="whitespace-pre-wrap text-sm">{reply.answer}</div>
          {reply.sources?.length ? (
            <div className="text-xs text-[var(--ldv-text-muted)] mt-2">
              Referenced: {reply.sources.join(', ')}
            </div>
          ) : null}
          {reply.sql_suggestion && (
            <pre className="mt-2 p-2 bg-primary text-white rounded text-xs overflow-auto">
              {reply.sql_suggestion}
            </pre>
          )}
          {reply.api_url_suggestions?.length ? (
            <div className="mt-2">
              <span className="text-xs text-[var(--ldv-text-muted)]">Suggested API:</span>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-xs bg-white border border-[var(--ldv-border)] px-2 py-1 rounded break-all">
                  {reply.api_url_suggestions[0]}
                </code>
                <button
                  type="button"
                  className="btn-secondary py-1 px-2 text-xs"
                  onClick={() => navigator.clipboard.writeText(reply.api_url_suggestions![0])}
                >
                  Copy API URL
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default function AgentPage() {
  return (
    <Suspense fallback={<div className="text-[var(--ldv-text-muted)] p-4">Loading…</div>}>
      <AgentPageContent />
    </Suspense>
  );
}
