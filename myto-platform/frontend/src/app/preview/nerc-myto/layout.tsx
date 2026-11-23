import { Suspense } from 'react';
import type { Metadata } from 'next';
import '@/styles/preview-console.css';
import PreviewShell from '@/components/preview/PreviewShell';

export const metadata: Metadata = {
  title: 'LDV Data Console · NERC MYTO',
  description: 'NERC MYTO electricity workspace. This address redirects to the live console.',
};

export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="ldv-console"><p style={{ padding: 24 }}>Loading console…</p></div>}>
      <PreviewShell>{children}</PreviewShell>
    </Suspense>
  );
}
