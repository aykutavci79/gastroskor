import type { Metadata } from 'next';
import { Suspense } from 'react';

import { YoreselLezzetDetailContent } from '@/app/yoresel-lezzetler/[slug]/YoreselLezzetDetailContent';
import { JsonLd } from '@/components/JsonLd';
import { getApiV1Base } from '@/lib/api-base';
import {
  getRegionalFlavorPageContent,
  resolveRegionalFlavorH1,
  resolveRegionalFlavorSchemaDescription,
  resolveRegionalFlavorSeo,
} from '@/lib/regional-flavor-page-content';
import { fetchRegionalFlavorRestaurants } from '@/lib/regional-flavor-restaurants';
import { getSiteUrl } from '@/lib/site-url';
import {
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  buildItemListJsonLd,
  buildRegionalFlavorFoodJsonLd,
} from '@/lib/structured-data';
import { buildSeoTitle, regionalFlavorSeoTitle } from '@/lib/seo-title';
import type { RegionalProductDetailResponse } from '@/lib/types';

type Props = {
  params: Promise<{ slug: string }>;
};

const siteUrl = getSiteUrl();

async function fetchProduct(slug: string): Promise<RegionalProductDetailResponse | null> {
  try {
    const response = await fetch(
      `${getApiV1Base()}/regional-flavors/products/${encodeURIComponent(slug)}?city=Bursa`,
      { next: { revalidate: 86400 } },
    );
    if (!response.ok) return null;
    return (await response.json()) as RegionalProductDetailResponse;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const pageContent = getRegionalFlavorPageContent(slug);
  if (pageContent) {
    const seo = resolveRegionalFlavorSeo(pageContent);
    const titleText = regionalFlavorSeoTitle(pageContent.name, pageContent.city);
    return {
      title: buildSeoTitle(titleText),
      description: seo.description,
      keywords: seo.keywords.split(',').map((keyword) => keyword.trim()),
      alternates: { canonical: `/yoresel-lezzetler/${slug}` },
      openGraph: { title: titleText, description: seo.description },
    };
  }

  const data = await fetchProduct(slug);
  if (!data?.product) {
    return { title: buildSeoTitle('Yöresel lezzet') };
  }
  const { product } = data;
  const titleText = regionalFlavorSeoTitle(product.name, product.city);
  const description = `${product.name} (${product.city}): ${product.summary} GastroSkor ile mekan önerileri.`;
  return {
    title: buildSeoTitle(titleText),
    description,
    alternates: { canonical: `/yoresel-lezzetler/${slug}` },
    openGraph: { title: titleText, description },
  };
}

export default async function YoreselLezzetDetailPage({ params }: Props) {
  const { slug } = await params;
  const pageContent = getRegionalFlavorPageContent(slug);
  const productData = await fetchProduct(slug);
  const gastroResult = pageContent
    ? await fetchRegionalFlavorRestaurants(pageContent.city, pageContent.searchTag)
    : null;

  const jsonLd =
    pageContent && productData?.product
      ? [
          buildBreadcrumbJsonLd(siteUrl, [
            { name: 'Ana Sayfa', path: '/' },
            { name: 'Yöresel Lezzetler', path: '/yoresel-lezzetler?city=Bursa' },
            { name: pageContent.name, path: `/yoresel-lezzetler/${slug}` },
          ]),
          buildRegionalFlavorFoodJsonLd(siteUrl, {
            name: pageContent.name,
            description: resolveRegionalFlavorSchemaDescription(pageContent),
            path: `/yoresel-lezzetler/${slug}`,
            areaServed: `${pageContent.city}, Türkiye`,
          }),
          ...(gastroResult && gastroResult.items.length > 0
            ? [
                buildItemListJsonLd(siteUrl, gastroResult.items, {
                  name: resolveRegionalFlavorH1(pageContent),
                  path: `/yoresel-lezzetler/${slug}`,
                }),
              ]
            : []),
          ...(buildFaqJsonLd(pageContent.faq) ? [buildFaqJsonLd(pageContent.faq)!] : []),
        ]
      : null;

  return (
    <>
      {jsonLd ? <JsonLd data={jsonLd} /> : null}
      <Suspense
        fallback={
          <main className="mx-auto max-w-5xl px-4 py-10">
            <p className="text-sm text-content-muted">Restoran önerileri yükleniyor…</p>
          </main>
        }>
        <YoreselLezzetDetailContent
          pageContent={pageContent}
          initialProduct={productData?.product ?? null}
          gastroRestaurants={gastroResult?.items ?? []}
          gastroMatchedByTag={gastroResult?.matchedByTag ?? false}
        />
      </Suspense>
    </>
  );
}
