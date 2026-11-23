import type { Metadata } from 'next';
import QualityReview from '@/components/preview/views/QualityReview';

export const metadata: Metadata = { title: 'Data Quality · LDV Data Console' };

export default function Page() {
  return <QualityReview />;
}
