import type { Metadata } from 'next';
import { LineageView } from '@/components/preview/views/Catalog';

export const metadata: Metadata = { title: 'Lineage · LDV Data Console' };

export default function Page() {
  return <LineageView />;
}
