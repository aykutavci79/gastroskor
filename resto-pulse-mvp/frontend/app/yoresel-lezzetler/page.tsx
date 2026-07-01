import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Suspense } from 'react';

import { YoreselLezzetlerContent } from '@/app/yoresel-lezzetler/YoreselLezzetlerContent';
import { YoreselLezzetlerCityPicker } from '@/app/yoresel-lezzetler/YoreselLezzetlerCityPicker';
import pagesData from '@/data/regional-flavor-pages.json';
import { JsonLd } from '@/components/JsonLd';
import { getSiteUrl } from '@/lib/site-url';
import { regionalFlavorListSeoDescription } from '@/lib/seo-description';
import { buildSeoTitle } from '@/lib/seo-title';
import { buildBreadcrumbJsonLd, buildRegionalFlavorListJsonLd } from '@/lib/structured-data';
import { normalizeCityInput } from '@/lib/turkiye-provinces';

const siteUrl = getSiteUrl();
const regionalPages = pagesData.pages.map((page) => ({ slug: page.slug, name: page.name }));

type Props = {
  searchParams: Promise<{ city?: string }>;
};

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

export default async function YoreselLezzetlerPage({ searchParams }: Props) {
  const t = useTranslations('yoreselWeb');
  const { city: rawCity } = await searchParams;
  const city = normalizeCityInput(rawCity?.trim() || 'Bursa');

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
      <main className="mx-auto max-w-5xl px-4 py-10">
        <Link href="/" className="text-sm text-content-muted hover:text-content">
          {t('backToHome')}
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-content">{t('title', { city })}</h1>
        <p className="mt-2 max-w-2xl text-sm text-content-muted">
          {t('description', { city, count: regionalPages.length })}
        </p>
        <h2 className="mt-8 text-xl font-semibold text-content">{t('sectionTitle')}</h2>
        <YoreselLezzetlerCityPicker city={city} />
        <Suspense fallback={<p className="mt-4 text-sm text-content-muted">{t('loading')}</p>}>
          <YoreselLezzetlerContent city={city} />
        </Suspense>
      </main>
    </>
  );
}
