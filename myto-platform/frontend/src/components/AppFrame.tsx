'use client';

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import AuthorityStrip from '@/components/AuthorityStrip';
import GlobalFiltersBar from '@/components/GlobalFiltersBar';
import ProductHeader from '@/components/ProductHeader';

/**
 * Production shell for every route except /preview/*.
 * Preview routes render their own console so this frame is not nested inside it.
 */
export default function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith('/preview')) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AuthorityStrip />
        <Suspense fallback={<div className="h-10 border-b border-[var(--ldv-border)]" />}>
          <GlobalFiltersBar />
        </Suspense>
        <ProductHeader />
        <main className="flex-1 p-4 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
