'use client';

import { useEffect, useState } from 'react';

import { RestaurantCard } from '@/components/RestaurantCard';
import { listRestaurants } from '@/lib/api';
import type { RestaurantListItem } from '@/lib/types';

type Props = {
  initialRestaurants: RestaurantListItem[];
  q: string;
  city: string;
};

export function HomeRestaurantGrid({ initialRestaurants, q, city }: Props) {
  const [restaurants, setRestaurants] = useState(initialRestaurants);

  useEffect(() => {
    setRestaurants(initialRestaurants);
  }, [initialRestaurants]);

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        listRestaurants({
          q: q || undefined,
          city: city || undefined,
          origin_lat: pos.coords.latitude,
          origin_lng: pos.coords.longitude,
        })
          .then(setRestaurants)
          .catch(() => {
            /* sunucu listesi kalsin */
          });
      },
      () => {},
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 120_000 },
    );
  }, [q, city]);

  const displayRestaurants = restaurants.slice(0, 6);
  const hasMore = restaurants.length > 6;

  if (restaurants.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center text-content-muted">
        Sonuc bulunamadi. Farkli bir arama dene.
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {displayRestaurants.map((restaurant) => (
          <RestaurantCard key={restaurant.id} restaurant={restaurant} compact />
        ))}
      </div>
      {hasMore ? (
        <p className="mt-3 text-center text-sm text-content-muted">
          {restaurants.length - 6} sonuc daha var · aramayi daraltin veya asagidaki one cikanlara bakin
        </p>
      ) : null}
    </>
  );
}
