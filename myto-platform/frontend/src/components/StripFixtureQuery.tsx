'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/** Drops the fixture flag from live console URLs. Renders nothing, so it cannot change the layout tree. */
export default function StripFixtureQuery() {
  const pathname = usePathname() ?? '';
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (!params.has('demo')) return;
    const next = new URLSearchParams(params.toString());
    next.delete('demo');
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [params, pathname, router]);

  return null;
}
