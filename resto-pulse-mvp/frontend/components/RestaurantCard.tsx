import Link from 'next/link';

import { GeographicalIndicationBadge } from '@/components/GeographicalIndicationBadge';
import { RestaurantMenuPreview } from '@/components/RestaurantMenuPreview';
import { RestaurantPromoBadges } from '@/components/RestaurantPromoBadges';
import { premiumBorderClass } from '@/components/RestaurantPremiumFrame';
import type { RestaurantListItem } from '@/lib/types';

type Props = {
  restaurant: RestaurantListItem;
};

export function RestaurantCard({ restaurant }: Props) {
  const premium = Boolean(restaurant.is_premium_partner);

  return (
    <Link
      href={`/restaurants/${restaurant.id}`}
      className={`group relative block rounded-2xl bg-panel/80 p-5 pt-6 shadow-glow transition hover:-translate-y-0.5 ${premiumBorderClass(premium)} ${
        premium ? 'hover:ring-amber-400/90' : 'hover:border-accent/50'
      }`}>
      {premium ? (
        <span className="absolute -top-2.5 left-3 rounded-md bg-gradient-to-r from-amber-500 to-amber-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950">
          Uye isletme
        </span>
      ) : null}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white group-hover:text-accent">{restaurant.name}</h3>
          <p className="text-sm text-slate-400">
            {[restaurant.district, restaurant.city].filter(Boolean).join(', ') || 'Konum belirtilmedi'}
          </p>
        </div>
        <div className="rounded-xl bg-slate-800 px-3 py-1.5 text-center">
          <p className="text-xs text-slate-400">Puan</p>
          <p className="text-lg font-bold text-amber-300">
            {restaurant.avg_rating != null ? restaurant.avg_rating.toFixed(1) : '—'}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <p className="inline-flex rounded-full bg-slate-800/80 px-3 py-1 text-xs font-medium text-slate-300">
          {restaurant.category ?? 'Genel'}
        </p>
        <GeographicalIndicationBadge
          hasGeographicalIndication={restaurant.has_geographical_indication}
          giProductName={restaurant.gi_product_name}
          geoIndications={restaurant.geo_indications ?? []}
          compact
        />
      </div>
      <RestaurantPromoBadges promo={restaurant.promo} />
      <RestaurantMenuPreview
        items={restaurant.menu_preview ?? []}
        totalCount={restaurant.menu_item_count}
        compact
      />
    </Link>
  );
}
