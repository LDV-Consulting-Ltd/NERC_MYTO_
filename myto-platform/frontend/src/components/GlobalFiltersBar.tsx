'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { getLatestDiscos, getLatestMonths } from '@/lib/api';
import { useGlobalFilters } from '@/lib/hooks';
import { DEBOUNCE_SEARCH_MS } from '@/lib/constants';

export default function GlobalFiltersBar() {
  const { filters, setDisco, setYear, setMonth, setBand, setSearch } = useGlobalFilters();
  const [searchInput, setSearchInput] = useState(filters.search);

  const { data: discosData } = useQuery({
    queryKey: queryKeys.discos(),
    queryFn: async () => (await getLatestDiscos()).discos,
    staleTime: 60 * 1000,
  });
  const { data: monthsData } = useQuery({
    queryKey: queryKeys.months(filters.disco || undefined),
    queryFn: async () => (await getLatestMonths(filters.disco || undefined)).months,
    staleTime: 60 * 1000,
  });

  const discos = discosData ?? [];
  const months = monthsData ?? [];

  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  const debouncedSetSearch = useCallback(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
    }, DEBOUNCE_SEARCH_MS);
    return () => clearTimeout(t);
  }, [searchInput, setSearch]);

  useEffect(debouncedSetSearch, [searchInput, debouncedSetSearch]);

  const monthOptions = months.map((m) => ({
    value: `${m.year}-${m.month_name}`,
    label: `${m.month_name} ${m.year}`,
    year: m.year,
    month_name: m.month_name,
  }));

  const selectedMonth = filters.year != null && filters.month
    ? monthOptions.find((o) => o.year === filters.year && o.month_name === filters.month)
    : null;

  return (
    <div className="sticky top-0 z-20 bg-white border-b border-[var(--ldv-border)] px-4 py-2 flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2 text-sm">
        <span className="text-[var(--ldv-text-muted)] w-12">Disco</span>
        <select
          value={filters.disco}
          onChange={(e) => setDisco(e.target.value)}
          className="border border-[var(--ldv-border)] rounded px-2 py-1.5 text-sm text-primary bg-white min-w-[140px]"
          aria-label="Filter by Disco"
        >
          <option value="">All</option>
          {discos.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <span className="text-[var(--ldv-text-muted)] w-14">Month</span>
        <select
          value={selectedMonth?.value ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) {
              setYear(null);
              setMonth('');
              return;
            }
            const o = monthOptions.find((x) => x.value === v);
            if (o) {
              setYear(o.year);
              setMonth(o.month_name);
            }
          }}
          className="border border-[var(--ldv-border)] rounded px-2 py-1.5 text-sm text-primary bg-white min-w-[140px]"
          aria-label="Filter by Month"
        >
          <option value="">All</option>
          {monthOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <span className="text-[var(--ldv-text-muted)] w-10">Band</span>
        <input
          type="text"
          value={filters.band}
          onChange={(e) => setBand(e.target.value)}
          placeholder="Band"
          className="border border-[var(--ldv-border)] rounded px-2 py-1.5 text-sm text-primary bg-white w-24"
          aria-label="Filter by Band"
        />
      </label>
      <label className="flex items-center gap-2 text-sm flex-1 min-w-[180px]">
        <span className="text-[var(--ldv-text-muted)] w-14">Search</span>
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search commitments…"
          className="border border-[var(--ldv-border)] rounded px-2 py-1.5 text-sm text-primary bg-white flex-1 max-w-md"
          aria-label="Search"
        />
      </label>
    </div>
  );
}
