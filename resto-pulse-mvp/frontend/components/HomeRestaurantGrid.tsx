'use client';

import { useEffect, useState } from 'react';

import { RestaurantCard } from '@/components/RestaurantCard';
import { listRestaurants, searchLivePlaces } from '@/lib/api';
import { livePlaceToRestaurantCard } from '@/lib/live-place-card';
import type { RestaurantListItem } from '@/lib/types';

type Props = {
  initialRestaurants: RestaurantListItem[];
  q: string;
  city: string;
};

export function HomeRestaurantGrid({ initialRestaurants, q, city }: Props) {
  const [restaurants, setRestaurants] = useState(initialRestaurants);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<'db' | 'google' | null>(null);

  useEffect(() => {
    setRestaurants(initialRestaurants);
  }, [initialRestaurants]);

  useEffect(() => {
    const trimmed = q.trim();
    let cancelled = false;

    async function load(coords?: { lat: number; lng: number }) {
      setLoading(true);
      try {
        if (trimmed.length >= 2) {
          const live = await searchLivePlaces({
            q: trimmed,
            city: city.trim() || 'Bursa',
            limit: 20,
            origin_lat: coords?.lat,
            origin_lng: coords?.lng,
          });
          if (cancelled) return;
          setRestaurants(live.items.map(livePlaceToRestaurantCard));
          setSource('google');
          return;
        }

        const list = await listRestaurants({
          q: trimmed || undefined,
          city: city.trim() || undefined,
          origin_lat: coords?.lat,
          origin_lng: coords?.lng,
        });
        if (cancelled) return;
        setRestaurants(list);
        setSource('db');
      } catch {
        if (!cancelled) {
          setRestaurants([]);
          setSource(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (!navigator.geolocation) {
      void load();
      return () => {
        cancelled = true;
      };
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void load({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        void load();
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 120_000 },
    );

    return () => {
      cancelled = true;
    };
  }, [q, city]);

  const displayRestaurants = restaurants.slice(0, 6);
  const hasMore = restaurants.length > 6;

  if (loading && restaurants.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center text-content-muted">
        Aranıyor…
      </div>
    );
  }

  if (restaurants.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center text-content-muted">
        {q.trim() ? (
          <>
            Sonuç bulunamadı. Farklı yazım dene veya aşağıdaki <strong>Canlı arama</strong> kutusunu kullan
            (Google Haritalar).
          </>
        ) : (
          <>
            Öne çıkan liste: üye işletmeler ve yorumu olan mekanlar. Yeni bir yer için isim yazıp ara (en az 2
            harf) — Google sonuçları gelir.
          </>
        )}
      </div>
    );
  }

  return (
    <>
      {source === 'google' && q.trim() ? (
        <p className="mb-3 text-xs text-content-muted">
          Google canlı arama sonuçları · &quot;{q.trim()}&quot;
        </p>
      ) : null}
      {source === 'db' && q.trim() ? (
        <p className="mb-3 text-xs text-content-muted">
          GastroSkor veritabanı · daha önce kayıtlı / yorumlu mekanlar
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
        {displayRestaurants.map((restaurant) => (
          <RestaurantCard key={restaurant.id} restaurant={restaurant} compact />
        ))}
      </div>
      {hasMore ? (
        <p className="mt-3 text-center text-sm text-content-muted">
          {restaurants.length - 6} sonuç daha var · aramayı daraltın veya aşağıdaki canlı aramayı deneyin
        </p>
      ) : null}
    </>
  );
}
