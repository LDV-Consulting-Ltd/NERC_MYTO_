import type { Metadata } from 'next';
import Warehouse from '@/components/preview/views/Warehouse';

export const metadata: Metadata = { title: 'Silver · LDV Data Console' };

export default function Page() {
  return <Warehouse layer="silver" />;
}
