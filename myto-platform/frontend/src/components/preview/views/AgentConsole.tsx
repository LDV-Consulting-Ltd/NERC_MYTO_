'use client';

import { useState } from 'react';
import { useGlobalFilters, useSnapshotMeta } from '@/lib/hooks';
import { agentChat } from '@/lib/api';
import type { AgentResponse } from '@/lib/types';
import { isPublishedSnapshot } from '../measure';
import { useDemo, useFreshness } from '../useConsoleData';
import { PageHeader, StateBlock, StatusPill } from '../ui';

export default function AgentConsole() {
  const demo = useDemo();
  const freshness = useFreshness(demo);
  const meta = useSnapshotMeta();
  const { filters } = useGlobalFilters();
  const [question, setQuestion] = useState('');
  const [reply, setReply] = useState<AgentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const published = isPublishedSnapshot(freshness.data);

  const ask = async () => {
    const text = question.trim();
    if (!text || demo) return;
    setLoading(true);
    setError(null);
    setReply(null);
    try {
      const response = await agentChat(text, 'latest', meta.data?.run_id ?? undefined, filters.disco || undefined);
      setReply(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The agent request failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Regulatory Intelligence Agent"
        description="Questions use the existing agent endpoint, scoped to the latest snapshot and the current DisCo filter when one is set."
        productionHref="/agent"
      />
      <p className="pc-gap">
        Context: {published ? `latest snapshot ${freshness.data?.latest_run_id ? String(freshness.data.latest_run_id).slice(0, 8) : ''}`.trim() : 'no published snapshot'}
        {filters.disco ? ` · DisCo ${filters.disco}` : ''}. The current app does not add an extra permission check on this page.
      </p>
      {!published && !demo && <StateBlock tone="awaiting" title="No published snapshot to query" />}
      <label htmlFor="agent-question" className="pc-sr">Question</label>
      <textarea
        id="agent-question"
        className="pc-field"
        rows={4}
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        placeholder="Ask about a dataset, a column, or the pipeline."
        disabled={demo}
      />
      <div style={{ marginTop: 8 }}>
        <button type="button" className="pc-btn pc-btn-primary" onClick={ask} disabled={demo || loading || !question.trim()}>
          {loading ? 'Asking…' : 'Ask'}
        </button>
      </div>
      {demo && <p className="pc-gap">The agent is disabled in demo layout so sample records are not sent as if they were published.</p>}
      {error && <StateBlock tone="error" title="The agent request failed">{error}</StateBlock>}
      {reply && (
        <section className="pc-card">
          <div className="pc-card-h">
            <h2>Answer</h2>
            <StatusPill tone="info">Latest snapshot</StatusPill>
          </div>
          <div className="pc-card-b">
            <p>{reply.answer || 'No answer text returned.'}</p>
            {(reply.sources ?? []).length > 0 && <p className="pc-gap">Sources: {reply.sources?.join(', ')}</p>}
            {reply.sql_suggestion && <pre className="pc-gap" style={{ whiteSpace: 'pre-wrap' }}>{reply.sql_suggestion}</pre>}
            {(reply.api_url_suggestions ?? []).map((item) => (
              <p key={item}><a href={item}>{item}</a></p>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
