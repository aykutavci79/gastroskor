import type { Metadata } from 'next';
import { Suspense } from 'react';

import { YoreselLezzetlerContent } from '@/app/yoresel-lezzetler/YoreselLezzetlerContent';
import pagesData from '@/data/regional-flavor-pages.json';
import { JsonLd } from '@/components/JsonLd';
import { getSiteUrl } from '@/lib/site-url';
import { regionalFlavorListSeoDescription } from '@/lib/seo-description';
import { buildSeoTitle } from '@/lib/seo-title';
import { buildBreadcrumbJsonLd, buildRegionalFlavorListJsonLd } from '@/lib/structured-data';

const siteUrl = getSiteUrl();
const regionalPages = pagesData.pages.map((page) => ({ slug: page.slug, name: page.name }));

export const metadata: Metadata = {
  title: buildSeoTitle('Bursa yöresel lezzetler'),
  description: regionalFlavorListSeoDescription(),
  keywords: [
    'bursa yöresel lezzetler',
    'bursa ne yenir',
    'bursa iskender',
    'bursa pideli köfte',
    'bursa cantık',
    'inegöl köfte',
    'coğrafi işaret bursa',
    'gastroskor',
  ],
  alternates: { canonical: '/yoresel-lezzetler' },
};

export default function YoreselLezzetlerPage() {
  return (
    <>
      <JsonLd
        data={[
          buildBreadcrumbJsonLd(siteUrl, [
            { name: 'Ana Sayfa', path: '/' },
            { name: 'Yöresel Lezzetler', path: '/yoresel-lezzetler' },
          ]),
          buildRegionalFlavorListJsonLd(siteUrl, regionalPages),
        ]}
      />
      <Suspense
      fallback={
        <main className="mx-auto max-w-5xl px-4 py-10">
          <p className="text-sm text-content-muted">Yöresel lezzetler yükleniyor…</p>
        </main>
      }>
        <YoreselLezzetlerContent />
      </Suspense>
    </>
  );
}
