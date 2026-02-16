'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { getDqSummary, getDqIssues } from '@/lib/api';
import { QUERY_STALE_MS, QUERY_RETRY } from '@/lib/constants';

export function useDQSummary(runId?: string | null) {
  return useQuery({
    queryKey: queryKeys.dqSummary(runId ?? undefined),
    queryFn: () => getDqSummary(runId ?? undefined),
    staleTime: QUERY_STALE_MS,
    retry: QUERY_RETRY,
    refetchOnWindowFocus: false,
  });
}

export function useDQIssues(params?: { run_id?: string; status?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: queryKeys.dqIssues(params),
    queryFn: () => getDqIssues(params),
    staleTime: QUERY_STALE_MS,
    retry: QUERY_RETRY,
    refetchOnWindowFocus: false,
  });
}
