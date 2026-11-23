import type { Metadata } from 'next';
import { MetadataView } from '@/components/preview/views/Catalog';

export const metadata: Metadata = { title: 'Metadata Catalog · LDV Data Console' };

export default function Page() {
  return <MetadataView />;
}
