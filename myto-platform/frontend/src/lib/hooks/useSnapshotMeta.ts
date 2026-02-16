'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { getSnapshotMeta } from '@/lib/api';
import { QUERY_STALE_MS, QUERY_RETRY } from '@/lib/constants';

export function useSnapshotMeta() {
  return useQuery({
    queryKey: queryKeys.snapshotMeta(),
    queryFn: getSnapshotMeta,
    staleTime: QUERY_STALE_MS,
    retry: QUERY_RETRY,
    refetchOnWindowFocus: false,
  });
}
