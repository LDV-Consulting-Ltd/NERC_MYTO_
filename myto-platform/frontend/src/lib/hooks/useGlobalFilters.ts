'use client';

import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

export interface GlobalFiltersState {
  disco: string;
  year: number | null;
  month: string;
  band: string;
  search: string;
}

const DEFAULT: GlobalFiltersState = {
  disco: '',
  year: null,
  month: '',
  band: '',
  search: '',
};

export function useGlobalFilters(): {
  filters: GlobalFiltersState;
  setDisco: (v: string) => void;
  setYear: (v: number | null) => void;
  setMonth: (v: string) => void;
  setBand: (v: string) => void;
  setSearch: (v: string) => void;
  setFilters: (partial: Partial<GlobalFiltersState>) => void;
  toApiParams: () => { disco_code?: string; year?: number; month?: string; band?: string; q?: string };
} {
  const searchParams = useSearchParams();

  const filters = useMemo((): GlobalFiltersState => {
    const disco = searchParams.get('disco') ?? '';
    const y = searchParams.get('year');
    const year = y ? parseInt(y, 10) : null;
    const month = searchParams.get('month') ?? '';
    const band = searchParams.get('band') ?? '';
    const search = searchParams.get('q') ?? '';
    return { disco, year: Number.isNaN(year) ? null : year, month, band, search };
  }, [searchParams]);

  const setDisco = useCallback((v: string) => update('disco', v), []);
  const setMonth = useCallback((v: string) => update('month', v), []);
  const setBand = useCallback((v: string) => update('band', v), []);
  const setYear = useCallback((v: number | null) => update('year', v === null ? '' : String(v)), []);
  const setSearch = useCallback((v: string) => update('q', v), []);

  function update(key: string, value: string) {
    const url = new URL(window.location.href);
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
    window.history.replaceState(null, '', url.toString());
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  const setFilters = useCallback((partial: Partial<GlobalFiltersState>) => {
    const url = new URL(window.location.href);
    if (partial.disco !== undefined) (partial.disco ? url.searchParams.set('disco', partial.disco) : url.searchParams.delete('disco'));
    if (partial.year !== undefined) (partial.year != null ? url.searchParams.set('year', String(partial.year)) : url.searchParams.delete('year'));
    if (partial.month !== undefined) (partial.month ? url.searchParams.set('month', partial.month) : url.searchParams.delete('month'));
    if (partial.band !== undefined) (partial.band ? url.searchParams.set('band', partial.band) : url.searchParams.delete('band'));
    if (partial.search !== undefined) (partial.search ? url.searchParams.set('q', partial.search) : url.searchParams.delete('q'));
    window.history.replaceState(null, '', url.toString());
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, []);

  const toApiParams = useCallback(() => {
    const p: { disco_code?: string; year?: number; month?: string; band?: string; q?: string } = {};
    if (filters.disco) p.disco_code = filters.disco;
    if (filters.year != null) p.year = filters.year;
    if (filters.month) p.month = filters.month;
    if (filters.band) p.band = filters.band;
    if (filters.search) p.q = filters.search;
    return p;
  }, [filters]);

  return { filters, setDisco, setYear, setMonth, setBand, setSearch, setFilters, toApiParams };
}
