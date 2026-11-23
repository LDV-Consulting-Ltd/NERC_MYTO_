import type { Metadata } from 'next';
import NationalOverview from '@/components/preview/views/NationalOverview';

export const metadata: Metadata = { title: 'National Overview · LDV Data Console' };

export default function Page() {
  return <NationalOverview />;
}
