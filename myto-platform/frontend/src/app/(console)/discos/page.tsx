import type { Metadata } from 'next';
import DiscoDirectory from '@/components/preview/views/DiscoDirectory';

export const metadata: Metadata = { title: 'DisCo Profiles · LDV Data Console' };

export default function Page() {
  return <DiscoDirectory />;
}
