import Link from 'next/link';

import { GeographicalIndicationBadge } from '@/components/GeographicalIndicationBadge';
import { RestaurantCardCover } from '@/components/RestaurantCardCover';
import { RestaurantCardScores } from '@/components/RestaurantCardScores';
import { RestaurantCategoryBadge } from '@/components/RestaurantCategoryBadge';
import { RestaurantMenuPreview } from '@/components/RestaurantMenuPreview';
import { RestaurantPromoBadges } from '@/components/RestaurantPromoBadges';
import { RestaurantPromoLinks } from '@/components/RestaurantPromoLinks';
import { premiumBorderClass } from '@/components/RestaurantPremiumFrame';
import type { RestaurantListItem } from '@/lib/types';

type Props = {
  restaurant: RestaurantListItem;
  compact?: boolean;
  rank?: number;
};

export function RestaurantCard({ restaurant, compact = false, rank }: Props) {
  const premium = Boolean(restaurant.is_premium_partner);
  const location = [restaurant.district, restaurant.city].filter(Boolean).join(', ') || 'Konum belirtilmedi';
  const menuItems = restaurant.menu_preview ?? [];
  const coverImage = restaurant.promo?.menu_image_url ?? null;

  return (
    <Link
      href={`/restaurants/${restaurant.id}`}
      className={`group relative block overflow-hidden rounded-2xl bg-panel/80 shadow-glow transition hover:-translate-y-0.5 ${premiumBorderClass(premium)} ${
        compact ? 'min-h-[9.5rem]' : 'min-h-[11rem]'
      } ${premium ? 'hover:ring-amber-400/90' : 'hover:border-accent/50'}`}>
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
                className={`font-semibold text-white group-hover:text-accent ${compact ? 'line-clamp-2 text-sm leading-snug' : 'line-clamp-2 text-base leading-snug'}`}>
                {restaurant.name}
              </h3>
            </div>
            <p className={`text-slate-400 ${compact ? 'truncate text-[10px]' : 'text-xs'}`}>{location}</p>
          </div>
        </div>

        <RestaurantCardScores
          googleRating={restaurant.google_rating}
          googleReviewCount={restaurant.google_review_count}
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
          <RestaurantPromoBadges promo={restaurant.promo} compact={compact} />
          <RestaurantPromoLinks promo={restaurant.promo} compact hideMenuImageLink={Boolean(coverImage)} />
          <RestaurantMenuPreview
            items={menuItems.slice(0, compact ? 2 : 3)}
            totalCount={restaurant.menu_item_count}
            compact
          />
        </div>
      </div>
    </Link>
  );
}
