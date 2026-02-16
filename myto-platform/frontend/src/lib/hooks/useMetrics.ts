'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { getMetricsPipeline, getMetricsGeocode, getMetricsExtractionMethods } from '@/lib/api';
import { QUERY_STALE_MS, QUERY_RETRY } from '@/lib/constants';

export function useMetricsPipeline(runs = 10) {
  return useQuery({
    queryKey: queryKeys.metricsPipeline(runs),
    queryFn: () => getMetricsPipeline(runs),
    staleTime: QUERY_STALE_MS,
    retry: QUERY_RETRY,
    refetchOnWindowFocus: false,
  });
}

export function useMetricsGeocode() {
  return useQuery({
    queryKey: queryKeys.metricsGeocode(),
    queryFn: getMetricsGeocode,
    staleTime: QUERY_STALE_MS,
    retry: QUERY_RETRY,
    refetchOnWindowFocus: false,
  });
}

export function useMetricsExtractionMethods() {
  return useQuery({
    queryKey: queryKeys.metricsExtraction(),
    queryFn: getMetricsExtractionMethods,
    staleTime: QUERY_STALE_MS,
    retry: QUERY_RETRY,
    refetchOnWindowFocus: false,
  });
}
