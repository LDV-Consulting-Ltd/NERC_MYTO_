'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { getRuns, getRun, getRunStages, getRunEvents, createRun } from '@/lib/api';
import { QUERY_STALE_MS, QUERY_RETRY } from '@/lib/constants';

const RUN_POLL_MS = 5000;

export function useRuns(limit = 50, offset = 0) {
  return useQuery({
    queryKey: queryKeys.runs(limit, offset),
    queryFn: () => getRuns(limit, offset),
    staleTime: QUERY_STALE_MS,
    retry: QUERY_RETRY,
    refetchOnWindowFocus: false,
  });
}

export function useRun(runId: string | null, pollWhenRunning = false) {
  return useQuery({
    queryKey: queryKeys.run(runId!),
    queryFn: () => getRun(runId!),
    enabled: !!runId,
    staleTime: QUERY_STALE_MS,
    retry: QUERY_RETRY,
    refetchOnWindowFocus: false,
    refetchInterval: pollWhenRunning ? RUN_POLL_MS : false,
  });
}

export function useRunStages(runId: string | null) {
  return useQuery({
    queryKey: queryKeys.runStages(runId!),
    queryFn: () => getRunStages(runId!),
    enabled: !!runId,
    staleTime: QUERY_STALE_MS,
    retry: QUERY_RETRY,
    refetchOnWindowFocus: false,
  });
}

export function useRunEvents(runId: string | null, limit = 500, offset = 0, pollWhenRunning = false) {
  return useQuery({
    queryKey: queryKeys.runEvents(runId!, limit, offset),
    queryFn: () => getRunEvents(runId!, limit, offset),
    enabled: !!runId,
    staleTime: QUERY_STALE_MS,
    retry: QUERY_RETRY,
    refetchOnWindowFocus: false,
    refetchInterval: pollWhenRunning ? RUN_POLL_MS : false,
  });
}

export function useCreateRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (opts?: { notes?: string; source_root_url?: string }) =>
      createRun(opts?.notes, opts?.source_root_url),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.runs(50, 0) });
      qc.invalidateQueries({ queryKey: queryKeys.snapshotMeta() });
    },
  });
}
