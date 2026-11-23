import type { Metadata } from 'next';
import OperationsConsole from '@/components/preview/views/OperationsConsole';

export const metadata: Metadata = { title: 'Control Panel · LDV Data Console' };

export default function Page() {
  return <OperationsConsole />;
}
