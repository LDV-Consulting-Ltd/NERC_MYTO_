import type { Metadata } from 'next';
import { ObservabilityView } from '@/components/preview/views/Catalog';

export const metadata: Metadata = { title: 'Observability · LDV Data Console' };

export default function Page() {
  return <ObservabilityView />;
}
