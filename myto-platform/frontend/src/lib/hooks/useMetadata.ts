'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { getMetadataDatasets, getMetadataDatasetSchema, getMetadataColumnsDictionary } from '@/lib/api';
import { QUERY_STALE_LONG_MS, QUERY_RETRY } from '@/lib/constants';

export function useMetadataDatasets() {
  return useQuery({
    queryKey: queryKeys.metadataDatasets(),
    queryFn: async () => (await getMetadataDatasets()).datasets,
    staleTime: QUERY_STALE_LONG_MS,
    retry: QUERY_RETRY,
    refetchOnWindowFocus: false,
  });
}

export function useMetadataSchema(name: string | null) {
  return useQuery({
    queryKey: queryKeys.metadataSchema(name!),
    queryFn: () => getMetadataDatasetSchema(name!),
    enabled: !!name,
    staleTime: QUERY_STALE_LONG_MS,
    retry: QUERY_RETRY,
    refetchOnWindowFocus: false,
  });
}

export function useMetadataDictionary() {
  return useQuery({
    queryKey: queryKeys.metadataDictionary(),
    queryFn: async () => (await getMetadataColumnsDictionary()).columns,
    staleTime: QUERY_STALE_LONG_MS,
    retry: QUERY_RETRY,
    refetchOnWindowFocus: false,
  });
}
