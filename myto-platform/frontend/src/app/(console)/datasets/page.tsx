import type { Metadata } from 'next';
import { DatasetsView } from '@/components/preview/views/Catalog';

export const metadata: Metadata = { title: 'Datasets · LDV Data Console' };

export default function Page() {
  return <DatasetsView />;
}
