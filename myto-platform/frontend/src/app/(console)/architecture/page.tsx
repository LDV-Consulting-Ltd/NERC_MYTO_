import type { Metadata } from 'next';
import { ArchitectureView } from '@/components/preview/views/Catalog';

export const metadata: Metadata = { title: 'Architecture · LDV Data Console' };

export default function Page() {
  return <ArchitectureView />;
}
