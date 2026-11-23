import type { Metadata } from 'next';
import EndpointMatrix from '@/components/EndpointMatrix';
import { CoverageView } from '@/components/preview/views/Catalog';

export const metadata: Metadata = { title: 'Capability Map · LDV Data Console' };

export default function Page() {
  return (
    <>
      <CoverageView />
      <EndpointMatrix />
    </>
  );
}
