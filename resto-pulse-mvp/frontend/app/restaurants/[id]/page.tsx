import type { Metadata } from 'next';

import { RestaurantDetailView } from '@/components/RestaurantDetailView';
import { getRestaurant, listRestaurantReviews } from '@/lib/api';
import { getSiteUrl } from '@/lib/site-url';

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const restaurant = await getRestaurant(id);
    const place = [restaurant.district, restaurant.city].filter(Boolean).join(', ');
    const title = place ? `${restaurant.name} — ${place}` : restaurant.name;
    const rating =
      restaurant.avg_rating != null ? ` GS puanı ${restaurant.avg_rating.toFixed(1)}.` : '';
    const description = `${restaurant.name} GastroSkor sayfası.${rating} Yorumlar, menü ve konum.`;
    return {
      title,
      description,
      alternates: { canonical: `/restaurants/${id}` },
      openGraph: {
        title,
        description,
        url: `${getSiteUrl()}/restaurants/${id}`,
        type: 'website',
      },
    };
  } catch {
    return { title: 'Restoran' };
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

  return (
    <RestaurantDetailView
      restaurantId={id}
      initialRestaurant={restaurant}
      initialReviews={reviews}
      initialError={initialError}
    />
  );
}
