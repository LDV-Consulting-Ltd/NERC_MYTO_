import type { Metadata } from 'next';
import { GovernanceView } from '@/components/preview/views/Catalog';

export const metadata: Metadata = { title: 'Governance · LDV Data Console' };

export default function Page() {
  return <GovernanceView />;
}
