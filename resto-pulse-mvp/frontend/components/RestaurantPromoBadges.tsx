import Link from 'next/link';
import type { MouseEvent } from 'react';

import type { RestaurantPromoPublic } from '@/lib/types';

type Props = {
  promo: RestaurantPromoPublic | null | undefined;
  restaurantId?: string;
  menuItemCount?: number;
  compact?: boolean;
};

function stopNav(e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
}

export function RestaurantPromoBadges({ promo, restaurantId, menuItemCount = 0, compact = false }: Props) {
  if (!promo && !menuItemCount) return null;

  const hasCourier = Boolean(promo?.has_own_courier);
  const offerText = promo?.direct_order_text?.trim() ?? '';
  const hasOffer = offerText.length > 0;
  const hasMenu =
    Boolean(promo?.menu_image_url?.trim()) || menuItemCount > 0;

  if (!hasCourier && !hasOffer && !hasMenu) return null;

  const menuClass =
    'inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-100 hover:bg-amber-500/25';

  return (
    <div className={`flex flex-wrap gap-1.5 ${compact ? '' : 'mt-2'}`}>
      {hasCourier ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/40 bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-200">
          <span aria-hidden>🛵</span> Kendi kurye
        </span>
      ) : null}
      {hasMenu && restaurantId ? (
        <Link href={`/restaurants/${restaurantId}#menu`} onClick={stopNav} className={menuClass}>
          <span aria-hidden>📋</span> Menu
        </Link>
      ) : null}
      {hasOffer ? (
        <span className="inline-flex rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
          {offerText}
        </span>
      ) : null}
    </div>
  );
}
