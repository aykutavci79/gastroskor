'use client';

import { useEffect, useState } from 'react';

import { RestaurantCard } from '@/components/RestaurantCard';
import { listCityTopRestaurants } from '@/lib/api';
import type { RestaurantTrendingItem } from '@/lib/types';

function formatDistance(item: RestaurantTrendingItem): string | null {
  if (item.distance_km != null) {
    return item.distance_km < 1 ? `${Math.round(item.distance_km * 1000)} m` : `${item.distance_km} km`;
  }
  return null;
}

function Top5Card({
  restaurant,
  index,
}: {
  restaurant: RestaurantTrendingItem;
  index: number;
}) {
  const distance = formatDistance(restaurant);
  const googleRating = restaurant.week_avg_rating ?? restaurant.google_rating;
  const googleCount = restaurant.google_user_ratings_total ?? restaurant.google_review_count;
  const isPartner = Boolean(restaurant.is_premium_partner || restaurant.promo);
  const href = isPartner ? `/restaurants/${restaurant.id}` : null;

  return (
    <div className="home-top5-scroll-item md:w-auto md:flex-none">
      <RestaurantCard
        restaurant={restaurant}
        compact
        rank={index + 1}
        distanceLabel={distance ?? undefined}
        distanceMeters={restaurant.distance_meters}
        mapsDirectionsUrl={restaurant.maps_directions_url}
        googleRating={googleRating}
        googleReviewCount={googleCount}
        href={href}
        featuredBorder={isPartner}
        cornerBadge={isPartner ? 'ÖNE ÇIKAN' : null}
      />
    </div>
  );
}

export function FeaturedCityTop() {
  const [items, setItems] = useState<RestaurantTrendingItem[]>([]);
  const [city, setCity] = useState('Bursa');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    function load(lat?: number, lng?: number) {
      setLoading(true);
      setError(null);
      listCityTopRestaurants({ lat, lng, limit: 5 })
        .then((data) => {
          if (!cancelled) {
            setItems(data.items);
            setCity(data.city);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : 'One cikanlar yuklenemedi');
            setItems([]);
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }

    if (!navigator.geolocation) {
      load();
      return () => {
        cancelled = true;
      };
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => load(pos.coords.latitude, pos.coords.longitude),
      () => load(),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 120_000 },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  const listClassName =
    'home-top5-scroll md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:pb-0 lg:grid-cols-3 xl:grid-cols-5';

  return (
    <section className="space-y-4">
      <div>
        <p className="text-sm font-medium uppercase tracking-wider text-accent">One cikanlar</p>
        <h2 className="text-xl font-semibold text-content sm:text-2xl">
          ÖNE ÇIKANLAR — {city} Top 5
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-content-muted">
          Google Haritalar puanina gore il bazli en iyi 5 restoran · 24 saat onbellek
        </p>
      </div>

      {loading ? (
        <div className={listClassName}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="home-top5-scroll-item h-44 animate-pulse rounded-2xl bg-surface-input md:h-48 md:w-auto" />
          ))}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-brand-gold">
          {error}
        </div>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-content-muted">
          Bu il icin liste henuz hazir degil.
        </div>
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <div className={listClassName}>
          {items.map((restaurant, index) => (
            <Top5Card key={restaurant.google_place_id ?? restaurant.id} restaurant={restaurant} index={index} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
