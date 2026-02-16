'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { getLatestMapPoints } from '@/lib/api';
import { QUERY_STALE_MS, QUERY_RETRY } from '@/lib/constants';

export function useMapPoints(params: { disco_code?: string; year?: number; month?: string; band?: string }) {
  const apiParams = {
    disco_code: params.disco_code || undefined,
    year: params.year ?? undefined,
    month: params.month || undefined,
    band: params.band || undefined,
  };
  return useQuery({
    queryKey: queryKeys.mapPoints(apiParams),
    queryFn: () => getLatestMapPoints(apiParams),
    staleTime: QUERY_STALE_MS,
    retry: QUERY_RETRY,
    refetchOnWindowFocus: false,
  });
}
