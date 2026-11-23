'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { getLatestDiscos } from '@/lib/api';

export default function DiscosPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.discos(),
    queryFn: async () => (await getLatestDiscos()).discos,
    staleTime: 60 * 1000,
  });

  const discos = data ?? [];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--ldv-primary)] tracking-tight mb-2">DisCo Intelligence</h1>
      <p className="text-sm text-[var(--ldv-text-muted)] mb-4">
        Distribution company coverage and profiles. Select a DisCo for territory view, KPIs, and commitment data.
      </p>
      {error && <p className="text-red-600">Failed to load discos.</p>}
      {isLoading && <p className="text-[var(--ldv-text-muted)]">Loading…</p>}
      <ul className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
        {discos.map((d) => (
          <li key={d}>
            <Link
              href={`/disco/${encodeURIComponent(d)}`}
              className="block p-3 rounded-lg border border-[var(--ldv-border)] bg-surface hover:bg-white hover:border-accent"
            >
              {d}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
