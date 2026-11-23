import type { Metadata } from 'next';
import GeocodingReview from '@/components/preview/views/GeocodingReview';

export const metadata: Metadata = { title: 'Geocoding Review · LDV Data Console' };

export default function Page() {
  return <GeocodingReview />;
}
