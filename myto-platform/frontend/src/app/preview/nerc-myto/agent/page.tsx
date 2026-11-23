import type { Metadata } from 'next';
import AgentConsole from '@/components/preview/views/AgentConsole';

export const metadata: Metadata = { title: 'Regulatory Intelligence Agent · LDV Data Console' };

export default function Page() {
  return <AgentConsole />;
}
