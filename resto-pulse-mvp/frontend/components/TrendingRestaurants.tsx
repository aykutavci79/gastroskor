'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { GeographicalIndicationBadge } from '@/components/GeographicalIndicationBadge';
import { getLivePlaceDetails, listTrendingRestaurantsWeek } from '@/lib/api';
import type { LivePlaceDetails, RestaurantTrendingItem } from '@/lib/types';

function formatDistance(item: RestaurantTrendingItem): string | null {
  if (item.distance_km != null) {
    return item.distance_km < 1 ? `${Math.round(item.distance_km * 1000)} m` : `${item.distance_km} km`;
  }
  return null;
}

function TrendingMiniMap({ items }: { items: RestaurantTrendingItem[] }) {
  const positioned = useMemo(() => {
    const withCoords = items.filter((r) => r.latitude != null && r.longitude != null);
    if (withCoords.length === 0) return [];

    const lats = withCoords.map((r) => r.latitude!);
    const lngs = withCoords.map((r) => r.longitude!);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const latSpan = maxLat - minLat || 0.01;
    const lngSpan = maxLng - minLng || 0.01;

    return withCoords.map((r) => ({
      id: r.id,
      name: r.name,
      left: ((r.longitude! - minLng) / lngSpan) * 100,
      top: ((maxLat - r.latitude!) / latSpan) * 100,
    }));
  }, [items]);

  if (positioned.length === 0) return null;

  return (
    <div className="relative h-48 overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-950/80 sm:h-56">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(34,197,94,0.12),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(59,130,246,0.1),transparent_45%)]" />
      {positioned.map((pin) => (
        <div
          key={pin.id}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${pin.left}%`, top: `${pin.top}%` }}
          title={pin.name}>
          <span className="block h-3 w-3 rounded-full border-2 border-slate-900 bg-accent shadow-glow" />
        </div>
      ))}
      <p className="absolute bottom-2 left-3 text-xs text-slate-500">Konumuna gore yerlesim</p>
    </div>
  );
}

function GoogleTrendingCard({
  restaurant,
  index,
  onOpenDetails,
}: {
  restaurant: RestaurantTrendingItem;
  index: number;
  onOpenDetails: (placeId: string) => void;
}) {
  const distance = formatDistance(restaurant);
  const placeId = restaurant.google_place_id ?? restaurant.id;
  const total = restaurant.google_user_ratings_total;

  return (
    <article className="rounded-2xl border border-slate-700/70 bg-panel/80 p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="rounded-lg bg-accent/15 px-2 py-0.5 text-xs font-bold text-accent">
          #{index + 1}
        </span>
        {distance ? <span className="text-xs text-slate-400">{distance}</span> : null}
      </div>
      <h3 className="font-semibold text-white">{restaurant.name}</h3>
      <p className="text-xs text-slate-400">{restaurant.city ?? 'Bursa'}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        {restaurant.week_avg_rating != null ? (
          <span className="rounded-full bg-slate-800 px-2 py-1 text-amber-200">
            Google {restaurant.week_avg_rating.toFixed(1)}
          </span>
        ) : null}
        {total != null ? (
          <span className="rounded-full bg-slate-800 px-2 py-1 text-slate-300">
            {total.toLocaleString('tr-TR')} yorum
          </span>
        ) : null}
        {restaurant.week_review_count > 0 ? (
          <span className="rounded-full bg-slate-800 px-2 py-1 text-slate-400">
            Güncel yorumlar
          </span>
        ) : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {restaurant.maps_directions_url ? (
          <a
            href={restaurant.maps_directions_url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-200 hover:border-accent/50">
            Haritada ac
          </a>
        ) : null}
        <button
          type="button"
          onClick={() => onOpenDetails(placeId)}
          className="rounded-lg bg-accent/20 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/30">
          Google yorumlari
        </button>
      </div>
    </article>
  );
}

export function TrendingRestaurants() {
  const [items, setItems] = useState<RestaurantTrendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationLabel, setLocationLabel] = useState<string>('Bursa merkez');
  const [details, setDetails] = useState<LivePlaceDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const isGoogleSource = items[0]?.source === 'google' || items.length === 0;

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

  async function openGoogleDetails(placeId: string) {
    setDetailsLoading(true);
    setDetailsError(null);
    try {
      const data = await getLivePlaceDetails(placeId);
      setDetails(data);
      document.getElementById('trending-google-details')?.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      setDetails(null);
      setDetailsError(err instanceof Error ? err.message : 'Detay yuklenemedi');
    } finally {
      setDetailsLoading(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-accent">Öne çıkanlar</p>
          <h2 className="text-xl font-semibold text-white sm:text-2xl">
            Yakınındaki popüler 6 restoran
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Google Haritalar puanı ve yorum sayısına göre seçildi ·{' '}
            {locationLabel === 'Konumun' ? 'konumuna' : locationLabel} yakın olanlar önce
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <div className="h-48 animate-pulse rounded-2xl bg-slate-800/60 sm:h-56" />
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-800/60" />
            ))}
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          {error}
        </div>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-slate-400">
          Google listesi bos. API anahtarini ve Places API erisimini kontrol edin; asagidaki Canli
          Ara ile de arayabilirsiniz.
        </div>
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
          <TrendingMiniMap items={items} />
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((restaurant, index) =>
              isGoogleSource ? (
                <GoogleTrendingCard
                  key={restaurant.id}
                  restaurant={restaurant}
                  index={index}
                  onOpenDetails={openGoogleDetails}
                />
              ) : (
                <Link
                  key={restaurant.id}
                  href={`/restaurants/${restaurant.id}`}
                  className="group block rounded-2xl border border-slate-700/70 bg-panel/80 p-4 transition hover:border-accent/50">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <span className="rounded-lg bg-accent/15 px-2 py-0.5 text-xs font-bold text-accent">
                      #{index + 1}
                    </span>
                    {formatDistance(restaurant) ? (
                      <span className="text-xs text-slate-400">{formatDistance(restaurant)}</span>
                    ) : null}
                  </div>
                  <h3 className="font-semibold text-white group-hover:text-accent">{restaurant.name}</h3>
                  <p className="text-xs text-slate-400">
                    {[restaurant.district, restaurant.city].filter(Boolean).join(', ')}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full bg-slate-800 px-2 py-1 text-amber-200">
                      {restaurant.week_review_count} yorum / 7 gun
                    </span>
                    {restaurant.week_avg_rating != null ? (
                      <span className="rounded-full bg-slate-800 px-2 py-1 text-slate-300">
                        Hafta {restaurant.week_avg_rating.toFixed(1)}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2">
                    <GeographicalIndicationBadge
                      hasGeographicalIndication={restaurant.has_geographical_indication}
                      giProductName={restaurant.gi_product_name}
                      geoIndications={restaurant.geo_indications ?? []}
                      compact
                    />
                  </div>
                </Link>
              ),
            )}
          </div>
        </div>
      ) : null}

      {detailsLoading ? (
        <p className="text-sm text-slate-400">Google yorumlari yukleniyor…</p>
      ) : null}
      {detailsError ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          {detailsError}
        </div>
      ) : null}
      {details ? (
        <div
          id="trending-google-details"
          className="rounded-2xl border border-slate-700/70 bg-slate-900/80 p-5">
          <h3 className="text-lg font-semibold text-white">{details.name}</h3>
          {details.address ? <p className="text-sm text-slate-400">{details.address}</p> : null}
          <ul className="mt-4 space-y-3">
            {(details.reviews ?? []).slice(0, 5).map((review, idx) => (
              <li key={idx} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-sm">
                <div className="mb-1 flex flex-wrap gap-2 text-xs text-slate-400">
                  <span>{review.author_name ?? 'Anonim'}</span>
                  {review.rating != null ? <span>{review.rating} yildiz</span> : null}
                  {review.relative_time_description ? (
                    <span>{review.relative_time_description}</span>
                  ) : null}
                </div>
                {review.text ? <p className="text-slate-200">{review.text}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
