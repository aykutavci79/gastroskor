import type { Metadata } from 'next';
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
      'Bursa’da restoran ara, gastro skor oku ve yorum bırak. Nilüfer, Osmangazi ve çevre ilçeler.',
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
          {tagLabel ? `Bursa — ${tagLabel} restoranları` : 'Bursa Restoranları'}
        </h1>
        {tag ? (
          <p className="text-sm text-content-muted">
            <Link href="/bursa" className="text-brand underline">
              Tüm Bursa restoranları
            </Link>
            {' '}
            listesine dön
          </p>
        ) : null}
        <p className="max-w-3xl text-base leading-relaxed text-content-muted">
          <strong className="font-semibold text-content">GastroSkor</strong> ile Bursa&apos;da restoran
          keşfet: gastro skor, üye yorumları ve Google puanlarını tek ekranda gör. İskender, kebap,
          döner ve yöresel lezzetler için mekan ara; GS yorumu bırak veya{' '}
          <Link href="/yoresel-lezzetler" className="text-accent underline">
            Bursa yöresel ürünleri
          </Link>{' '}
          incele.
        </p>
      </header>

      <LivePlaceSearch city={CITY} cityStatus="ready" embedded />

      {restaurants.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-content">
            {tagLabel ? `Kayıtlı ${tagLabel} mekanları` : 'Kayıtlı Bursa restoranları'}
          </h2>
          <p className="text-sm text-content-muted">
            GastroSkor veritabanındaki mekanlar — puan ve yorum sayfalarına gitmek için isme tıkla.
          </p>
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
                        Gastro skor: {restaurant.avg_rating.toFixed(1)}
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
            ? `“${tagLabel}” için kayıtlı restoran bulunamadı; yukarıdan canlı arama ile Bursa mekanlarını deneyebilirsin.`
            : 'Henüz kayıtlı restoran listesi boş; yukarıdan canlı arama ile Bursa mekanlarını bulabilirsin.'}
        </p>
      )}

      <section className="rounded-2xl border border-border/70 bg-surface-input p-5 text-sm text-content-muted">
        <h2 className="text-base font-semibold text-content">Bursa&apos;da gastro nedir?</h2>
        <p className="mt-2">
          &quot;Gastro&quot; burada gastronomi ve yemek kültürü anlamında kullanılır. GastroSkor,
          Bursa ve Türkiye genelinde restoranları puanlayan bağımsız bir platformdur — tıbbi anlamdaki
          gastroenteroloji ile ilgisi yoktur.
        </p>
      </section>
    </div>
  );
}
