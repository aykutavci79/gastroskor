import type { Metadata } from 'next';

import { HomePageContent } from '@/components/HomePageContent';

export const metadata: Metadata = {
  title: 'GastroSkor — Türkiye ve Bursa restoran puanlama',
  description:
    'Gastro skor ile restoran ara. Bursa kebap, iskender ve daha fazlası için GS yorumu oku ve yaz. Google puanlarıyla karşılaştır.',
  alternates: { canonical: '/' },
};

export default function HomePage() {
  return (
    <>
      <p className="sr-only">
        GastroSkor — Türkiye ve Bursa restoranları için gastro skor, yorum ve keşif platformu.
        gastroskor, gastro, bursa restoran araması.
      </p>
      <HomePageContent />
    </>
  );
}
