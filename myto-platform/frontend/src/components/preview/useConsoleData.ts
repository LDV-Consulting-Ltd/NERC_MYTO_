'use client';

import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { endpoints } from '@/lib/endpoints';
import { queryKeys } from '@/lib/queryKeys';
import { getLatestCommitments, getLatestDiscos, getLatestMonths } from '@/lib/api';
import type { CommitmentRow, CoverageMeta, FreshnessMeta } from '@/lib/types';
import {
  DEMO_COMMITMENTS,
  DEMO_COVERAGE,
  DEMO_DISCOS,
  DEMO_FRESHNESS,
  DEMO_MONTHS,
  filterDemoCommitments,
} from './demoData';
import { previewHref } from './paths';

export function useDemo(): boolean {
  const params = useSearchParams();
  return params.get('demo') === '1';
}

export function usePreviewHref() {
  const demo = useDemo();
  return (path = '', params?: Record<string, string | number | null | undefined>) =>
    previewHref(path, demo, params);
}

async function readEnvelope<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const text = await response.text();
  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    try {
      const parsed = JSON.parse(text) as { detail?: unknown; message?: unknown };
      if (typeof parsed.detail === 'string') message = parsed.detail;
      else if (typeof parsed.message === 'string') message = parsed.message;
    } catch {
      if (text.trim()) message = text.slice(0, 180);
    }
    if (response.status >= 500 || /fetch failed|ECONNREFUSED/i.test(message)) {
      message = 'The data service is unreachable. No coverage figures are shown in its place.';
    }
    throw new Error(message);
  }
  const body = (text ? JSON.parse(text) : {}) as { data?: T } | T;
  if (body && typeof body === 'object' && 'data' in body && (body as { data?: T }).data != null) {
    return (body as { data: T }).data;
  }
  return body as T;
}

export function useFreshness(demo: boolean) {
  return useQuery({
    queryKey: demo ? ['preview-demo', 'freshness'] : queryKeys.metadataFreshness(),
    queryFn: () =>
      demo ? Promise.resolve(DEMO_FRESHNESS) : readEnvelope<FreshnessMeta>(endpoints.metadataFreshness()),
    staleTime: 60 * 1000,
  });
}

export function useCoverage(demo: boolean) {
  return useQuery({
    queryKey: demo ? ['preview-demo', 'coverage'] : queryKeys.metadataCoverage(),
    queryFn: () =>
      demo ? Promise.resolve(DEMO_COVERAGE) : readEnvelope<CoverageMeta>(endpoints.metadataCoverage()),
    staleTime: 60 * 1000,
  });
}

export function useDiscoList(demo: boolean) {
  return useQuery({
    queryKey: demo ? ['preview-demo', 'discos'] : queryKeys.discos(),
    queryFn: async () => (demo ? DEMO_DISCOS : (await getLatestDiscos()).discos),
    staleTime: 60 * 1000,
  });
}

export function useMonthList(demo: boolean, disco?: string) {
  return useQuery({
    queryKey: demo ? ['preview-demo', 'months', disco ?? 'all'] : queryKeys.months(disco),
    queryFn: async () => (demo ? DEMO_MONTHS : (await getLatestMonths(disco || undefined)).months),
    staleTime: 60 * 1000,
  });
}

export function useCommitmentPage(
  demo: boolean,
  params: {
    disco_code?: string;
    year?: number;
    month?: string;
    band?: string;
    q?: string;
    limit?: number;
    offset?: number;
  }
) {
  return useQuery({
    queryKey: demo
      ? ['preview-demo', 'commitments', params]
      : queryKeys.commitments(params),
    queryFn: async () => {
      if (demo) {
        const filtered = filterDemoCommitments(params);
        const offset = params.offset ?? 0;
        const limit = params.limit ?? filtered.length;
        return {
          commitments: filtered.slice(offset, offset + limit),
          meta: { count: filtered.length, limit, offset },
        };
      }
      return getLatestCommitments(params);
    },
    staleTime: 60 * 1000,
  });
}

export function pageCount(meta: { count?: number } | undefined, rows: CommitmentRow[]): number | null {
  return typeof meta?.count === 'number' ? meta.count : rows.length ? null : 0;
}
