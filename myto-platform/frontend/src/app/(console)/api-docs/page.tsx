import type { Metadata } from 'next';
import { ApisView } from '@/components/preview/views/Catalog';

export const metadata: Metadata = { title: 'APIs and Downloads · LDV Data Console' };

export default function Page() {
  return <ApisView />;
}
