import type { Metadata } from 'next';
import RegulatoryOrders from '@/components/preview/views/RegulatoryOrders';

export const metadata: Metadata = { title: 'Regulatory Orders · LDV Data Console' };

export default function Page() {
  return <RegulatoryOrders />;
}
