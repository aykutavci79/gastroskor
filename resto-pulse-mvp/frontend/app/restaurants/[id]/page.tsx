import { RestaurantDetailView } from '@/components/RestaurantDetailView';
import { getRestaurant, listRestaurantReviews } from '@/lib/api';

type Props = {
  params: Promise<{ id: string }>;
};

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
