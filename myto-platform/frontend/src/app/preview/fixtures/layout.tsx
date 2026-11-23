import { Suspense } from 'react';
import type { Metadata } from 'next';
import PreviewShell from '@/components/preview/PreviewShell';

export const metadata: Metadata = {
  title: 'Sample layout · LDV Data Console',
  description: 'Fixture-only preview. These records are not a published NERC snapshot.',
};

export default function FixtureLayout({ children }: { children: React.ReactNode }) {
  return (
    <PreviewShell>
      <Suspense fallback={<p className="pc-lede">Loading sample layout…</p>}>{children}</Suspense>
    </PreviewShell>
  );
}
