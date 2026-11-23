import { Suspense } from 'react';
import PreviewShell from '@/components/preview/PreviewShell';
import StripFixtureQuery from '@/components/StripFixtureQuery';

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <PreviewShell>
      <Suspense fallback={<p className="pc-lede">Loading the workspace…</p>}>
        <StripFixtureQuery />
        {children}
      </Suspense>
    </PreviewShell>
  );
}
