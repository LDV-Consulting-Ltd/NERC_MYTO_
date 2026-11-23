import type { Metadata } from 'next';
import '../styles/globals.css';
import { Providers } from './providers';
import AppFrame from '@/components/AppFrame';

export const metadata: Metadata = {
  title: 'LDV Electricity Data Infrastructure | NERC MYTO National Platform',
  description:
    'National infrastructure intelligence platform — regulator-grade electricity data, DisCo coverage, service commitments, data quality, and API access.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <Providers>
          <AppFrame>{children}</AppFrame>
        </Providers>
      </body>
    </html>
  );
}
