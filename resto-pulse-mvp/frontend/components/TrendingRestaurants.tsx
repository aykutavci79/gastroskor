'use client';

import { useEffect, useState } from 'react';

import { RestaurantCardCover } from '@/components/RestaurantCardCover';
import { RestaurantCardScores } from '@/components/RestaurantCardScores';
import { RestaurantCategoryBadge } from '@/components/RestaurantCategoryBadge';
import { RestaurantMenuPreview } from '@/components/RestaurantMenuPreview';
import { RestaurantPromoBadges } from '@/components/RestaurantPromoBadges';
import { RestaurantPromoLinks } from '@/components/RestaurantPromoLinks';
import { RestaurantCard } from '@/components/RestaurantCard';
import { premiumBorderClass } from '@/components/RestaurantPremiumFrame';
import { getLivePlaceDetails, listTrendingRestaurantsWeek } from '@/lib/api';
import type { LivePlaceDetails, RestaurantTrendingItem } from '@/lib/types';

function formatDistance(item: RestaurantTrendingItem): string | null {
  if (item.distance_km != null) {
    return item.distance_km < 1 ? `${Math.round(item.distance_km * 1000)} m` : `${item.distance_km} km`;
  }
  return null;
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
  const premium = Boolean(restaurant.is_premium_partner);

  const menuItems = restaurant.menu_preview ?? [];
  const coverImage = restaurant.promo?.menu_image_url ?? null;
  const googleRating = restaurant.week_avg_rating ?? restaurant.google_rating;
  const googleCount = restaurant.google_user_ratings_total ?? restaurant.google_review_count;

  return (
    <article
      className={`relative min-h-[9.5rem] overflow-hidden rounded-2xl bg-panel/80 ${premiumBorderClass(premium)}`}>
      <RestaurantCardCover
        imageUrl={coverImage}
        category={restaurant.category}
        name={restaurant.name}
        menuItems={menuItems}
        ownerEmoji={restaurant.card_emoji}
        compact
      />
      <div className="relative z-10 flex min-h-[inherit] flex-col p-3 pr-[48%]">
        <div className="mb-1 flex items-start justify-between gap-2">
          <span className="rounded-md bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold text-accent">
            #{index + 1}
          </span>
          {distance ? <span className="text-[10px] text-slate-400">{distance}</span> : null}
        </div>
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-white">{restaurant.name}</h3>
        <p className="truncate text-[10px] text-slate-400">{restaurant.city ?? 'Bursa'}</p>
        <RestaurantCardScores
          googleRating={googleRating}
          googleReviewCount={googleCount}
          gastroRating={restaurant.avg_rating}
          compact
        />
        <div className="mt-1">
          <RestaurantCategoryBadge
            category={restaurant.category}
            name={restaurant.name}
            menuItems={menuItems}
            ownerEmoji={restaurant.card_emoji}
            compact
          />
        </div>
        <div className="mt-auto pt-1">
          <RestaurantPromoBadges promo={restaurant.promo} compact />
          <RestaurantPromoLinks promo={restaurant.promo} compact hideMenuImageLink={Boolean(coverImage)} />
          <RestaurantMenuPreview items={menuItems.slice(0, 2)} totalCount={restaurant.menu_item_count} compact />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {restaurant.maps_directions_url ? (
              <a
                href={restaurant.maps_directions_url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-slate-600 px-2.5 py-1 text-[10px] text-slate-200 hover:border-accent/50">
                Haritada ac
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => onOpenDetails(placeId)}
              className="rounded-lg bg-accent/20 px-2.5 py-1 text-[10px] font-medium text-accent hover:bg-accent/30">
              Yorumlar
            </button>
          </div>
        </div>
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
      <div>
        <p className="text-sm font-medium uppercase tracking-wider text-accent">Öne çıkanlar</p>
        <h2 className="text-xl font-semibold text-white sm:text-2xl">Yakınındaki popüler 6 restoran</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          Google Haritalar puanı ·{' '}
          {locationLabel === 'Konumun' ? 'konumuna' : locationLabel} yakın olanlar
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl bg-slate-800/60 sm:h-48" />
          ))}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          {error}
        </div>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-slate-400">
          Google listesi bos. Asagidaki Canli Ara ile de arayabilirsiniz.
        </div>
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {items.map((restaurant, index) =>
            isGoogleSource ? (
              <GoogleTrendingCard
                key={restaurant.id}
                restaurant={restaurant}
                index={index}
                onOpenDetails={openGoogleDetails}
              />
            ) : (
              <RestaurantCard key={restaurant.id} restaurant={restaurant} compact rank={index + 1} />
            ),
          )}
        </div>
      ) : null}

      {detailsLoading ? <p className="text-sm text-slate-400">Google yorumlari yukleniyor…</p> : null}
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
