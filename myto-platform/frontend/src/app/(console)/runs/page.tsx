import type { Metadata } from 'next';
import RunsList from '@/components/preview/views/RunsList';

export const metadata: Metadata = { title: 'Pipeline Runs · LDV Data Console' };

export default function Page() {
  return <RunsList />;
}
