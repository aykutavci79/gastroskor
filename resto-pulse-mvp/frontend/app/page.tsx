import type { Metadata } from 'next';

import { HomePageContent } from '@/components/HomePageContent';

export const metadata: Metadata = {
  title: 'Türkiye restoranlarını tek çatıda puanla',
  description:
    'Mekan ara, GS yorumu oku ve yaz. Restoran sahipleri için panel, takipçi kuponları ve promosyonlar.',
  alternates: { canonical: '/' },
};

export default function HomePage() {
  return <HomePageContent />;
}
