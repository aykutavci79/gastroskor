import Link from 'next/link';

import { GeographicalIndicationBadge } from '@/components/GeographicalIndicationBadge';
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

  return (
    <Link
      href={`/restaurants/${restaurant.id}`}
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl bg-panel/80 shadow-glow transition hover:-translate-y-0.5 ${premiumBorderClass(premium)} ${
        compact ? 'p-4' : 'p-5'
      } ${premium ? 'hover:ring-amber-400/90' : 'hover:border-accent/50'}`}>
      <RestaurantCategoryBadge
        category={restaurant.category}
        name={restaurant.name}
        menuItems={menuItems}
        ownerEmoji={restaurant.card_emoji}
        watermark
      />

      <div className={`flex items-start justify-between gap-2 ${compact ? 'mb-2' : 'mb-3'}`}>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            {rank != null ? (
              <span className="rounded-md bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold text-accent">
                #{rank}
              </span>
            ) : null}
            <h3
              className={`font-semibold text-white group-hover:text-accent ${compact ? 'line-clamp-2 text-sm leading-snug' : 'text-lg'}`}>
              {restaurant.name}
            </h3>
          </div>
          <p className={`text-slate-400 ${compact ? 'truncate text-[11px]' : 'text-sm'}`}>{location}</p>
        </div>
        <div className={`shrink-0 rounded-xl bg-slate-800 text-center ${compact ? 'px-2 py-1' : 'px-3 py-1.5'}`}>
          <p className="text-[10px] text-slate-400">Puan</p>
          <p className={`font-bold text-amber-300 ${compact ? 'text-base' : 'text-lg'}`}>
            {restaurant.avg_rating != null ? restaurant.avg_rating.toFixed(1) : '—'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
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

      <div className="mt-auto">
        <RestaurantPromoBadges promo={restaurant.promo} compact={compact} />
        <RestaurantPromoLinks promo={restaurant.promo} compact />
        <RestaurantMenuPreview items={menuItems.slice(0, compact ? 2 : 3)} totalCount={restaurant.menu_item_count} compact />
      </div>
    </Link>
  );
}
