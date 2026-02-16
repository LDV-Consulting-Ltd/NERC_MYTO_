import type { Metadata } from 'next';
import { Suspense } from 'react';
import '../styles/globals.css';
import { Providers } from './providers';
import Sidebar from '@/components/Sidebar';
import AuthorityStrip from '@/components/AuthorityStrip';
import GlobalFiltersBar from '@/components/GlobalFiltersBar';
import ProductHeader from '@/components/ProductHeader';

export const metadata: Metadata = {
  title: 'LDV Electricity Data Infrastructure | NERC MYTO National Platform',
  description:
    'National infrastructure intelligence platform — regulator-grade electricity data, DisCo coverage, service commitments, data quality, and API access.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex">
        <Providers>
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <AuthorityStrip />
            <Suspense fallback={<div className="h-10 border-b border-[var(--ldv-border)]" />}>
              <GlobalFiltersBar />
            </Suspense>
            <ProductHeader />
            <main className="flex-1 p-4 overflow-auto">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
