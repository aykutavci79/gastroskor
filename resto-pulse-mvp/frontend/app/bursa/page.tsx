import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

import { JsonLd } from '@/components/JsonLd';
import { LivePlaceSearch } from '@/components/LivePlaceSearch';
import pagesData from '@/data/regional-flavor-pages.json';
import { getApiV1Base } from '@/lib/api-base';
import { filterRestaurantsBySearchTag } from '@/lib/regional-flavor-restaurants';
import { getSiteUrl } from '@/lib/site-url';
import { buildSeoTitle } from '@/lib/seo-title';
import { buildBreadcrumbJsonLd, buildItemListJsonLd } from '@/lib/structured-data';
import type { RestaurantListItem } from '@/lib/types';

type Props = {
  searchParams: Promise<{ tag?: string }>;
};

const CITY = 'Bursa';
const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  title: buildSeoTitle('Bursa restoranları'),
  description:
    'Bursa restoranlarını GastroSkor ile keşfet. İskender, kebap, döner ve daha fazlası için gastro skor, GS yorumları ve Google puanlarını karşılaştır.',
  keywords: [
    'bursa restoran',
    'bursa restoranları',
    'gastro',
    'gastroskor',
    'bursa yemek',
    'bursa kebap',
    'restoran puanlama bursa',
  ],
  alternates: { canonical: '/bursa' },
  openGraph: {
    title: 'Bursa Restoranları | GastroSkor',
    description:
      "Bursa'da restoran ara, gastro skor oku ve yorum bırak. Nilüfer, Osmangazi ve çevre ilçeler.",
    url: `${siteUrl}/bursa`,
    type: 'website',
  },
};

async function fetchBursaRestaurants(): Promise<RestaurantListItem[]> {
  try {
    const response = await fetch(`${getApiV1Base()}/restaurants?city=Bursa`, {
      next: { revalidate: 3600 },
    });
    if (!response.ok) return [];
    return (await response.json()) as RestaurantListItem[];
  } catch {
    return [];
  }
}

function resolveTagSearchTerm(tag: string): string {
  const normalizedTag = tag.trim().toLowerCase();
  const page = pagesData.pages.find((entry) => entry.seeAllHref.includes(`tag=${normalizedTag}`));
  return page?.searchTag ?? normalizedTag.replace(/-/g, ' ');
}

export default async function BursaRestaurantsPage({ searchParams }: Props) {
  const t = useTranslations('bursa');
  const { tag } = await searchParams;
  const allRestaurants = await fetchBursaRestaurants();
  const restaurants = tag
    ? filterRestaurantsBySearchTag(allRestaurants, resolveTagSearchTerm(tag))
    : allRestaurants;
  const tagLabel = tag ? resolveTagSearchTerm(tag) : null;

  return (
    <div className="space-y-8">
      <JsonLd
        data={[
          buildBreadcrumbJsonLd(siteUrl, [
            { name: 'GastroSkor', path: '/' },
            { name: 'Bursa Restoranları', path: '/bursa' },
          ]),
          ...(restaurants.length > 0
            ? [
                buildItemListJsonLd(siteUrl, restaurants, {
                  name: 'Bursa Restoranları — GastroSkor',
                  path: '/bursa',
                }),
              ]
            : []),
        ]}
      />

      <header className="space-y-3">
        <h1 className="text-3xl font-bold text-content">
          {tagLabel ? t('titleWithTag', { tag: tagLabel }) : t('titleDefault')}
        </h1>
        {tag ? (
          <p className="text-sm text-content-muted">
            <Link href="/bursa" className="text-brand underline">
              {t('backToAllLink')}
            </Link>
            {' '}
            {t('returnToList')}
          </p>
        ) : null}
        <p className="max-w-3xl text-base leading-relaxed text-content-muted">
          <strong className="font-semibold text-content">GastroSkor</strong>{' '}
          {t('description')}{' '}
          <Link href="/yoresel-lezzetler" className="text-accent underline">
            {t('descriptionYoreselLink')}
          </Link>{' '}
          {t('descriptionSuffix')}
        </p>
      </header>

      <LivePlaceSearch city={CITY} cityStatus="ready" embedded heading={t('liveSearchHeading')} />

      {restaurants.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-content">
            {tagLabel ? t('registeredWithTag', { tag: tagLabel }) : t('registeredDefault')}
          </h2>
          <p className="text-sm text-content-muted">{t('registeredSubtitle')}</p>
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {restaurants.map((restaurant) => {
              const place = [restaurant.district, restaurant.city].filter(Boolean).join(', ');
              return (
                <li
                  key={restaurant.id}
                  className="rounded-2xl border border-border/70 bg-surface-card p-4 transition hover:border-accent/40">
                  <Link href={`/restaurants/${restaurant.id}`} className="block">
                    <h3 className="font-semibold text-content">{restaurant.name}</h3>
                    {place ? <p className="mt-1 text-sm text-content-muted">{place}</p> : null}
                    {restaurant.avg_rating != null ? (
                      <p className="mt-2 text-sm text-brand-gold">
                        {t('gastroScore', { rating: restaurant.avg_rating.toFixed(1) })}
                      </p>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <p className="text-sm text-content-muted">
          {tag
            ? t('noResultsWithTag', { tag: tagLabel ?? '' })
            : t('noResultsDefault')}
        </p>
      )}

      <section className="rounded-2xl border border-border/70 bg-surface-input p-5 text-sm text-content-muted">
        <h2 className="text-base font-semibold text-content">{t('whatIsGastroTitle')}</h2>
        <p className="mt-2">{t('whatIsGastroContent')}</p>
      </section>
    </div>
  );
}
