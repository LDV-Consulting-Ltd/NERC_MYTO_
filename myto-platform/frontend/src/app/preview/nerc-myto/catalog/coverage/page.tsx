import type { Metadata } from 'next';
import { CoverageView } from '@/components/preview/views/Catalog';

export const metadata: Metadata = { title: 'Capability map · LDV Data Console' };

export default function Page() {
  return <CoverageView />;
}
