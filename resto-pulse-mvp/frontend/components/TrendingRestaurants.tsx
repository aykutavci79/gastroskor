'use client';

import { useEffect, useState } from 'react';

import { RestaurantCard } from '@/components/RestaurantCard';
import { listTrendingRestaurantsWeek } from '@/lib/api';
import { trendingDetailHref } from '@/lib/live-place-card';
import type { RestaurantTrendingItem } from '@/lib/types';

function formatDistance(item: RestaurantTrendingItem): string | null {
  if (item.distance_km != null) {
    return item.distance_km < 1 ? `${Math.round(item.distance_km * 1000)} m` : `${item.distance_km} km`;
  }
  return null;
}

export function TrendingRestaurants() {
  const [items, setItems] = useState<RestaurantTrendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationLabel, setLocationLabel] = useState<string>('Bursa merkez');

  useEffect(() => {
    let cancelled = false;

    function load(lat?: number, lng?: number, label = 'Bursa merkez') {
      setLoading(true);
      setError(null);
      setLocationLabel(label);
      listTrendingRestaurantsWeek({ lat, lng, city: 'Bursa', limit: 6, source: 'google' })
        .then((data) => {
          if (!cancelled) setItems(data);
        })
        .catch((err) => {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : 'Trend liste yuklenemedi');
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
      (pos) => load(pos.coords.latitude, pos.coords.longitude, 'Konumun'),
      () => load(),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 120_000 },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="space-y-4">
      <div>
        <p className="text-sm font-medium uppercase tracking-wider text-accent">Öne çıkanlar</p>
        <h2 className="text-xl font-semibold text-content sm:text-2xl">Yakınındaki popüler 6 restoran</h2>
        <p className="mt-1 max-w-2xl text-sm text-content-muted">
          Google Haritalar puanı ·{' '}
          {locationLabel === 'Konumun' ? 'konumuna' : locationLabel} yakın olanlar
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl bg-surface-input sm:h-48" />
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
          Google listesi bos. Asagidaki Canli Ara ile de arayabilirsiniz.
        </div>
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {items.map((restaurant, index) => {
            const distance = formatDistance(restaurant);
            const googleRating = restaurant.week_avg_rating ?? restaurant.google_rating;
            const googleCount =
              restaurant.google_user_ratings_total ?? restaurant.google_review_count;
            const isPartner = Boolean(restaurant.is_premium_partner || restaurant.promo);

            return (
              <RestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                compact
                rank={index + 1}
                distanceLabel={distance ?? undefined}
                distanceMeters={restaurant.distance_meters}
                mapsDirectionsUrl={restaurant.maps_directions_url}
                googleRating={googleRating}
                googleReviewCount={googleCount}
                href={trendingDetailHref(restaurant)}
                featuredBorder={isPartner}
                cornerBadge={isPartner ? 'ÖNE ÇIKAN' : null}
              />
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
