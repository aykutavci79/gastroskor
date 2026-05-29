import Link from 'next/link';
import type { ReactNode } from 'react';

import { GeographicalIndicationBadge } from '@/components/GeographicalIndicationBadge';
import { RestaurantCardCover } from '@/components/RestaurantCardCover';
import { RestaurantCardScores } from '@/components/RestaurantCardScores';
import { RestaurantCategoryBadge } from '@/components/RestaurantCategoryBadge';
import { RestaurantMenuPreview } from '@/components/RestaurantMenuPreview';
import { RestaurantCardTravelLinks } from '@/components/RestaurantCardTravelLinks';
import { RestaurantPromoBadges } from '@/components/RestaurantPromoBadges';
import { RestaurantPromoLinks } from '@/components/RestaurantPromoLinks';
import { premiumBorderClass } from '@/components/RestaurantPremiumFrame';
import type { RestaurantListItem } from '@/lib/types';

type Props = {
  restaurant: RestaurantListItem;
  compact?: boolean;
  rank?: number;
  distanceLabel?: string;
  distanceMeters?: number | null;
  mapsDirectionsUrl?: string | null;
  googleRating?: number | null;
  googleReviewCount?: number | null;
  /** null = kart tiklanmaz (ornegin saf Google trend) */
  href?: string | null;
  footer?: ReactNode;
};

export function RestaurantCard({
  restaurant,
  compact = false,
  rank,
  distanceLabel,
  distanceMeters,
  mapsDirectionsUrl,
  googleRating,
  googleReviewCount,
  href,
  footer,
}: Props) {
  const premium = Boolean(restaurant.is_premium_partner);
  const location = [restaurant.district, restaurant.city].filter(Boolean).join(', ') || 'Konum belirtilmedi';
  const menuItems = restaurant.menu_preview ?? [];
  const coverImage = restaurant.promo?.card_cover_image_url ?? null;
  const resolvedHref = href === undefined ? `/restaurants/${restaurant.id}` : href;

  const google =
    googleRating !== undefined ? googleRating : restaurant.google_rating;
  const googleCount =
    googleReviewCount !== undefined ? googleReviewCount : restaurant.google_review_count;
  const travelDistance = distanceMeters ?? restaurant.distance_meters;
  const travelMaps = mapsDirectionsUrl ?? restaurant.maps_directions_url;

  const shellClass = `group relative block overflow-hidden rounded-2xl bg-surface-card shadow-card transition ${premiumBorderClass(premium)} ${
    compact ? 'min-h-[9.5rem]' : 'min-h-[11rem]'
  } ${resolvedHref ? 'hover:-translate-y-0.5 duration-ui ease-ui' : ''} ${
    premium ? 'hover:ring-brand-gold/90' : resolvedHref ? 'hover:border-brand/50' : ''
  }`;

  const inner = (
    <>
      <RestaurantCardCover
        imageUrl={coverImage}
        category={restaurant.category}
        name={restaurant.name}
        menuItems={menuItems}
        ownerEmoji={restaurant.card_emoji}
        compact={compact}
      />

      <div
        className={`relative z-10 flex min-h-[inherit] flex-col ${compact ? 'p-3 pr-[48%]' : 'p-4 pr-[46%]'}`}>
        <div className={`flex items-start justify-between gap-2 ${compact ? 'mb-1' : 'mb-2'}`}>
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
              {rank != null ? (
                <span className="rounded-md bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold text-accent">
                  #{rank}
                </span>
              ) : null}
              <h3
                className={`font-semibold text-content ${resolvedHref ? 'group-hover:text-accent' : ''} ${compact ? 'line-clamp-2 text-sm leading-snug' : 'line-clamp-2 text-base leading-snug'}`}>
                {restaurant.name}
              </h3>
            </div>
            <p className={`text-content-muted ${compact ? 'truncate text-[10px]' : 'text-xs'}`}>{location}</p>
          </div>
          {distanceLabel ? (
            <span className={`shrink-0 text-content-muted ${compact ? 'text-[10px]' : 'text-xs'}`}>
              {distanceLabel}
            </span>
          ) : null}
        </div>

        <RestaurantCardScores
          googleRating={google}
          googleReviewCount={googleCount}
          gastroRating={restaurant.avg_rating}
          compact={compact}
        />

        <div className="mt-1 flex flex-wrap items-center gap-1">
          <RestaurantCategoryBadge
            category={restaurant.category}
            name={restaurant.name}
            menuItems={menuItems}
            ownerEmoji={restaurant.card_emoji}
            compact={compact}
          />
          {!compact ? (
            <GeographicalIndicationBadge
              hasGeographicalIndication={restaurant.has_geographical_indication}
              giProductName={restaurant.gi_product_name}
              geoIndications={restaurant.geo_indications ?? []}
              compact
            />
          ) : null}
        </div>

        <div className="mt-auto pt-1">
          <RestaurantPromoBadges
            promo={restaurant.promo}
            restaurantId={restaurant.id}
            menuItemCount={restaurant.menu_item_count}
            compact={compact}
          />
          <RestaurantCardTravelLinks
            mapsDirectionsUrl={travelMaps}
            distanceMeters={travelDistance}
            compact={compact}
          />
          <RestaurantPromoLinks promo={restaurant.promo} compact />
          <RestaurantMenuPreview
            items={menuItems.slice(0, compact ? 2 : 3)}
            totalCount={restaurant.menu_item_count}
            compact
          />
          {footer ? <div className="mt-2 flex flex-wrap gap-1.5">{footer}</div> : null}
        </div>
      </div>
    </>
  );

  if (resolvedHref) {
    return (
      <Link href={resolvedHref} className={shellClass}>
        {inner}
      </Link>
    );
  }

  return <article className={shellClass}>{inner}</article>;
}
