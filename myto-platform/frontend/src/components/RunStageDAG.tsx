'use client';

import { useState } from 'react';
import type { StageInfo } from '@/lib/types';

const ORDER = ['discover', 'download', 'extract', 'silver_transform', 'silver_geocode', 'gold_build', 'promote_latest'];

interface RunStageDAGProps {
  stages: StageInfo[];
  onViewLogs?: (stageName: string) => void;
}

export default function RunStageDAG({ stages, onViewLogs }: RunStageDAGProps) {
  const sorted = [...stages].sort((a, b) => ORDER.indexOf(a.stage_name) - ORDER.indexOf(b.stage_name));
  return (
    <div className="stage-dag">
      <div className="stage-dag-flow">
        {sorted.map((s, i) => (
          <div key={s.stage_name} className="stage-card-wrapper">
            {i > 0 && <span className="stage-arrow">→</span>}
            <div
              className={`stage-card ${s.status === 'success' ? 'success' : s.status === 'failed' ? 'failed' : 'running'}`}
            >
              <div className="stage-card-name">{s.stage_name}</div>
              <div className="stage-card-meta">
                {s.started_at && <span>{new Date(s.started_at).toLocaleTimeString()}</span>}
                {s.duration_ms != null && <span>{s.duration_ms}ms</span>}
              </div>
              <div className="stage-card-counts">
                in: {s.input_count ?? '—'} / out: {s.output_count ?? '—'} / err: {s.error_count ?? 0}
              </div>
              {onViewLogs && (
                <button type="button" className="stage-card-logs" onClick={() => onViewLogs(s.stage_name)}>
                  View logs
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
