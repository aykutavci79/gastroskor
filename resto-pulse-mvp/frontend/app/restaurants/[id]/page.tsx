import type { Metadata } from 'next';

import { JsonLd } from '@/components/JsonLd';
import { RestaurantDetailView } from '@/components/RestaurantDetailView';
import { getRestaurant, listRestaurantReviews } from '@/lib/api';
import { getSiteUrl } from '@/lib/site-url';
import { buildBreadcrumbJsonLd, buildRestaurantJsonLd } from '@/lib/structured-data';
import {
  buildSeoTitle,
  isPlaceholderRestaurantName,
  restaurantSeoTitle,
} from '@/lib/seo-title';
import { restaurantSeoDescription } from '@/lib/seo-description';
import { isTesterSeedRestaurant, testerRestaurantRobots } from '@/lib/tester-restaurant';

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const restaurant = await getRestaurant(id);
    const noindex =
      isTesterSeedRestaurant(restaurant) || isPlaceholderRestaurantName(restaurant.name);
    const titleText = restaurantSeoTitle(
      restaurant.name,
      restaurant.district,
      restaurant.city,
      restaurant.address,
    );
    const description = restaurantSeoDescription({
      name: restaurant.name,
      district: restaurant.district,
      city: restaurant.city,
      address: restaurant.address,
      category: restaurant.category,
      avg_rating: restaurant.avg_rating,
      gi_product_name: restaurant.gi_product_name,
    });
    return {
      title: buildSeoTitle(titleText),
      description,
      alternates: { canonical: `/restaurants/${id}` },
      ...(noindex ? { robots: testerRestaurantRobots() } : {}),
      openGraph: {
        title: titleText,
        description,
        url: `${getSiteUrl()}/restaurants/${id}`,
        type: 'website',
      },
    };
  } catch {
    return { title: buildSeoTitle('Restoran') };
  }
}

export default async function RestaurantDetailPage({ params }: Props) {
  const { id } = await params;

  let initialError: string | null = null;
  let restaurant: Awaited<ReturnType<typeof getRestaurant>> | null = null;
  let reviews: Awaited<ReturnType<typeof listRestaurantReviews>> = [];

  try {
    [restaurant, reviews] = await Promise.all([getRestaurant(id), listRestaurantReviews(id)]);
  } catch (err) {
    initialError = err instanceof Error ? err.message : 'Veri yuklenemedi.';
  }

  const siteUrl = getSiteUrl();
  const hideFromSearch = restaurant != null && isTesterSeedRestaurant(restaurant);
  const jsonLd =
    restaurant != null && !hideFromSearch
      ? [
          buildBreadcrumbJsonLd(siteUrl, [
            { name: 'GastroSkor', path: '/' },
            ...(restaurant.city
              ? [{ name: `${restaurant.city} Restoranları`, path: '/bursa' }]
              : []),
            { name: restaurant.name, path: `/restaurants/${id}` },
          ]),
          buildRestaurantJsonLd(restaurant, siteUrl, { reviewCount: reviews.length }),
        ]
      : null;

  return (
    <>
      {jsonLd ? <JsonLd data={jsonLd} /> : null}
      <RestaurantDetailView
        restaurantId={id}
        initialRestaurant={restaurant}
        initialReviews={reviews}
        initialError={initialError}
      />
    </>
  );
}
