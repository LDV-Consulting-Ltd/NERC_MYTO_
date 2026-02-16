'use client';

import { PRODUCT_NAME, PRODUCT_TAGLINE } from '@/lib/constants';

export default function ProductHeader() {
  return (
    <header className="shrink-0 px-4 pt-3 pb-2">
      <h1 className="text-xl font-semibold text-[var(--ldv-primary)] tracking-tight">
        {PRODUCT_NAME}
      </h1>
      <p className="text-xs text-[var(--ldv-text-muted)] mt-0.5">
        {PRODUCT_TAGLINE}
      </p>
      <div
        className="mt-2 h-px w-full bg-[var(--ldv-accent)]"
        style={{ opacity: 0.9 }}
        aria-hidden
      />
    </header>
  );
}
