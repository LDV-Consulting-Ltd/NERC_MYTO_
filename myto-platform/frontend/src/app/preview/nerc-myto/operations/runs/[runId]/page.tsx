import type { Metadata } from 'next';
import RunDetail from '@/components/preview/views/RunDetail';

export const metadata: Metadata = { title: 'Run detail · LDV Data Console' };

export default function Page() {
  return <RunDetail />;
}
