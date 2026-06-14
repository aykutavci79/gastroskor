import type { Metadata } from 'next';

import { HomePageContent } from '@/components/HomePageContent';
import { JsonLd } from '@/components/JsonLd';
import { buildWebSiteJsonLd } from '@/lib/structured-data';
import { getSiteHomeUrl } from '@/lib/site-url';

const homeUrl = getSiteHomeUrl();

export const metadata: Metadata = {
  title: 'GastroSkor — Türkiye ve Bursa restoran puanlama',
  description:
    'Gastro skor ile restoran ara. Bursa kebap, iskender ve daha fazlası için GS yorumu oku ve yaz. Google puanlarıyla karşılaştır.',
  alternates: { canonical: '/' },
  openGraph: {
    siteName: 'GastroSkor',
    url: homeUrl,
  },
};

export default function HomePage() {
  return (
    <>
      <JsonLd data={buildWebSiteJsonLd(homeUrl)} />
      <h1 className="sr-only">GastroSkor — Türkiye ve Bursa restoran puanlama</h1>
      <p className="sr-only">
        GastroSkor restoran keşif platformu. gastroskor, gastro skor, bursa restoran araması.
      </p>
      <HomePageContent />
    </>
  );
}
