import type { Metadata } from 'next';
import DiscoProfile from '@/components/preview/views/DiscoProfile';

export const metadata: Metadata = { title: 'DisCo profile · LDV Data Console' };

export default function Page() {
  return <DiscoProfile />;
}
