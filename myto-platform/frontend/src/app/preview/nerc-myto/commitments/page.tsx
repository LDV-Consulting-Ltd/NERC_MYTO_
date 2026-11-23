import type { Metadata } from 'next';
import CommitmentsExplorer from '@/components/preview/views/CommitmentsExplorer';

export const metadata: Metadata = { title: 'Commitments Explorer · LDV Data Console' };

export default function Page() {
  return <CommitmentsExplorer />;
}
