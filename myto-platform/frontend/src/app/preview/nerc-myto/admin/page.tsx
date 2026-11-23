import type { Metadata } from 'next';
import AdminConsole from '@/components/preview/views/AdminConsole';

export const metadata: Metadata = { title: 'Admin · LDV Data Console' };

export default function Page() {
  return <AdminConsole />;
}
