'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { FeaturedCompactCard } from '@/components/FeaturedCompactCard';
import { listTrendingRestaurantsWeek } from '@/lib/api';
import { filterFeaturedByRating } from '@/lib/featured-rating-filter';
import { trendingDetailHref } from '@/lib/live-place-card';
import type { RestaurantTrendingItem } from '@/lib/types';

const CARD_STEP = 272;

function formatDistance(item: RestaurantTrendingItem): string | null {
  if (item.distance_km != null) {
    return item.distance_km < 1 ? `${Math.round(item.distance_km * 1000)} m` : `${item.distance_km} km`;
  }
  if (item.distance_meters != null) {
    const m = item.distance_meters;
    return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
  }
  return null;
}

type LocationState = 'loading' | 'granted' | 'denied';

function FeaturedScrollRow({ children }: { children: React.ReactNode }) {
  const stripRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const refreshArrows = useCallback(() => {
    const el = stripRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    refreshArrows();
    el.addEventListener('scroll', refreshArrows, { passive: true });
    const ro = new ResizeObserver(refreshArrows);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', refreshArrows);
      ro.disconnect();
    };
  }, [refreshArrows, children]);

  function scrollBy(delta: number) {
    stripRef.current?.scrollBy({ left: delta, behavior: 'smooth' });
  }

  return (
    <div className="relative">
      {canPrev ? (
        <button
          type="button"
          aria-label="Önceki restoranlar"
          className="absolute left-0 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface-card/95 text-lg text-content shadow-card backdrop-blur-sm transition hover:border-accent hover:text-accent"
          onClick={() => scrollBy(-CARD_STEP)}>
          ‹
        </button>
      ) : null}
      {canNext ? (
        <button
          type="button"
          aria-label="Sonraki restoranlar"
          className="absolute right-0 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface-card/95 text-lg text-content shadow-card backdrop-blur-sm transition hover:border-accent hover:text-accent"
          onClick={() => scrollBy(CARD_STEP)}>
          ›
        </button>
      ) : null}
      <div ref={stripRef} className="featured-compact-scroll px-1">
        {children}
      </div>
    </div>
  );
}

export function FeaturedHighlightsSection() {
  const [items, setItems] = useState<RestaurantTrendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationState, setLocationState] = useState<LocationState>('loading');

  function loadFeatured(lat?: number, lng?: number) {
    setLoading(true);
    listTrendingRestaurantsWeek({
      lat,
      lng,
      city: 'Bursa',
      limit: 12,
      source: 'google',
    })
      .then((raw) => setItems(filterFeaturedByRating(raw, 6)))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationState('denied');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationState('granted');
        loadFeatured(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setLocationState('denied');
        setLoading(false);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 120_000 },
    );
  }, []);

  function requestLocation() {
    if (!navigator.geolocation) return;
    setLocationState('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationState('granted');
        loadFeatured(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setLocationState('denied');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-extrabold text-content sm:text-2xl">⭐ Öne Çıkanlar</h2>
        <p className="mt-1 text-sm text-content-muted">Konumuna yakın, 4.5+ yıldızlı restoranlar</p>
      </div>

      {locationState === 'denied' ? (
        <div className="rounded-2xl border border-border bg-surface-card p-4">
          <p className="font-bold text-content">Konumunuzu paylaşın</p>
          <p className="mt-1 text-sm text-content-muted">
            Yakınındaki öne çıkan restoranları göstermek için konum izni gerekli.
          </p>
          <button type="button" className="btn-primary btn-sm mt-3" onClick={requestLocation}>
            Konumu aç
          </button>
        </div>
      ) : null}

      {locationState === 'loading' || (locationState === 'granted' && loading) ? (
        <FeaturedScrollRow>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="featured-compact-scroll-item h-[212px] animate-pulse rounded-2xl bg-surface-input"
            />
          ))}
        </FeaturedScrollRow>
      ) : null}

      {locationState === 'granted' && !loading && items.length === 0 ? (
        <p className="text-sm text-content-muted">Şu an öne çıkan restoran bulunamadı.</p>
      ) : null}

      {locationState === 'granted' && !loading && items.length > 0 ? (
        <FeaturedScrollRow>
          {items.map((restaurant) => (
            <FeaturedCompactCard
              key={restaurant.google_place_id ?? restaurant.id}
              restaurant={restaurant}
              href={trendingDetailHref(restaurant)}
              googleRating={restaurant.week_avg_rating ?? restaurant.google_rating}
              distanceLabel={formatDistance(restaurant) ?? undefined}
            />
          ))}
        </FeaturedScrollRow>
      ) : null}
    </section>
  );
}
