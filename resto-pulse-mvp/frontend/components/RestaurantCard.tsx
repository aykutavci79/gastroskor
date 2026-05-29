import Link from 'next/link';

import { GeographicalIndicationBadge } from '@/components/GeographicalIndicationBadge';
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

  return (
    <Link
      href={`/restaurants/${restaurant.id}`}
      className={`group relative flex h-full flex-col rounded-2xl bg-panel/80 shadow-glow transition hover:-translate-y-0.5 ${premiumBorderClass(premium)} ${
        compact ? 'p-4 pt-5' : 'p-5 pt-6'
      } ${premium ? 'hover:ring-amber-400/90' : 'hover:border-accent/50'}`}>
      {premium ? (
        <span className="absolute -top-2.5 left-3 rounded-md bg-gradient-to-r from-amber-500 to-amber-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950">
          Uye isletme
        </span>
      ) : null}

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
        <p
          className={`inline-flex rounded-full bg-slate-800/80 font-medium text-slate-300 ${compact ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'}`}>
          {restaurant.category ?? 'Genel'}
        </p>
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
        <RestaurantMenuPreview
          items={(restaurant.menu_preview ?? []).slice(0, compact ? 2 : 3)}
          totalCount={restaurant.menu_item_count}
          compact
        />
      </div>
    </Link>
  );
}
