import type { Metadata } from 'next';
import FeederMap from '@/components/preview/views/FeederMap';

export const metadata: Metadata = { title: 'Feeder Map · LDV Data Console' };

export default function Page() {
  return <FeederMap />;
}
