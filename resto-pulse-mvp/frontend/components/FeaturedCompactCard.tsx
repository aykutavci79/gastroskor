'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { MouseEvent } from 'react';
import { useSession } from 'next-auth/react';

import { RestaurantFollowButton } from '@/components/RestaurantFollowButton';
import { RestaurantShareButton } from '@/components/RestaurantShareButton';
import { featuredCardClass } from '@/components/RestaurantPremiumFrame';
import { restaurantImageAlt } from '@/lib/seo-title';
import { resolveCardCoverUrl, optimizeCardCoverUrl } from '@/lib/card-cover';
import { trendingDetailHref } from '@/lib/live-place-card';
import type { RestaurantListItem, RestaurantTrendingItem } from '@/lib/types';

const CARD_W = 260;
const CARD_H = 212;
const PHOTO_H = 108;

type Props = {
  restaurant: RestaurantListItem & Partial<RestaurantTrendingItem>;
  href?: string | null;
  distanceLabel?: string | null;
  googleRating?: number | null;
  /** Ilk kart LCP icin: lazy degil, yuksek oncelik. */
  priorityImage?: boolean;
};

function locationLine(restaurant: RestaurantListItem): string | null {
  const parts = [restaurant.district, restaurant.city].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

function resolveFollowId(restaurant: RestaurantListItem): string | null {
  const rid = restaurant.restaurant_id?.trim();
  if (rid && /^[0-9a-f-]{36}$/i.test(rid)) return rid;
  const id = restaurant.id?.trim();
  if (id && /^[0-9a-f-]{36}$/i.test(id)) return id;
  return null;
}

export function FeaturedCompactCard({
  restaurant,
  href,
  distanceLabel,
  googleRating,
  priorityImage = false,
}: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const isPartner = Boolean(restaurant.is_premium_partner || restaurant.promo);
  const cover = optimizeCardCoverUrl(resolveCardCoverUrl(restaurant), CARD_W);
  const rating = googleRating ?? restaurant.week_avg_rating ?? restaurant.google_rating ?? null;
  const mapsUrl = restaurant.maps_directions_url?.trim() || null;
  const location = locationLine(restaurant);
  const detailHref = href ?? trendingDetailHref(restaurant as RestaurantTrendingItem);
  const followId = resolveFollowId(restaurant);

  function onCardClick(event: MouseEvent<HTMLElement>) {
    if (!detailHref) return;
    if ((event.target as HTMLElement).closest('a, button')) return;
    router.push(detailHref);
  }

  return (
    <div className="featured-compact-scroll-item shrink-0 snap-start">
      <div
        className={`featured-compact-card flex flex-col overflow-hidden rounded-2xl bg-surface-card ${featuredCardClass(isPartner)}${detailHref ? ' cursor-pointer' : ''}`}
        style={{ width: CARD_W, height: CARD_H }}
        onClick={onCardClick}
        aria-label={detailHref ? `${restaurant.name} detay` : undefined}>
        <div className="relative shrink-0 bg-surface-input" style={{ height: PHOTO_H }}>
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover}
              alt={restaurantImageAlt(restaurant.name, 'restoran fotoğrafı')}
              width={CARD_W}
              height={PHOTO_H}
              className="h-full w-full object-cover"
              loading={priorityImage ? 'eager' : 'lazy'}
              fetchPriority={priorityImage ? 'high' : undefined}
              decoding="async"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-4xl opacity-40">🍽️</div>
          )}
          {isPartner ? (
            <span className="featured-badge absolute right-2 top-2 rounded-md bg-accent/90 px-1.5 py-0.5 text-[10px] font-bold text-white">
              ÖNE ÇIKAN
            </span>
          ) : null}
          {mapsUrl ? (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-1.5 right-1.5 rounded-md bg-black/65 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-black/80"
              onClick={(e) => e.stopPropagation()}>
              🧭 Yol tarifi
            </a>
          ) : null}
        </div>

        <div className="flex min-h-0 flex-1 flex-col justify-center gap-0.5 px-2.5 py-1">
          {detailHref ? (
            <Link
              href={detailHref}
              className="inline-block min-h-[44px] py-2 text-xs font-bold leading-snug text-content hover:text-accent line-clamp-2"
              onClick={(e) => e.stopPropagation()}
              title={restaurant.name}>
              {restaurant.name}
            </Link>
          ) : (
            <h3 className="line-clamp-2 text-xs font-bold leading-snug text-content" title={restaurant.name}>
              {restaurant.name}
            </h3>
          )}
          {rating != null ? (
            <p className="text-[10px] font-semibold leading-none text-brand-gold">★ {rating.toFixed(1)} Google</p>
          ) : null}
          {distanceLabel || location ? (
            <p className="truncate text-[10px] leading-none text-content-muted">
              {[distanceLabel ? `📍 ${distanceLabel}` : null, location].filter(Boolean).join(' · ')}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-2.5 pb-2.5 pt-0.5">
          <div className="card-btn-group flex flex-wrap items-center">
            <RestaurantFollowButton
              restaurantId={followId}
              userEmail={session?.user?.email}
              detailHref={followId ? null : detailHref}
              compact
            />
            <RestaurantShareButton restaurant={restaurant} googleRating={rating} compact />
          </div>
          {detailHref ? (
            <Link
              href={detailHref}
              className="card-touch-target rounded-lg border border-border px-3 text-xs font-bold text-content-muted hover:border-accent hover:text-accent"
              onClick={(e) => e.stopPropagation()}>
              Detay
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export const FEATURED_CARD_WIDTH = CARD_W;
