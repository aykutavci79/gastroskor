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
    'inline-flex items-center gap-1 rounded-full border border-brand-gold/40 bg-brand-gold/15 px-2 py-0.5 text-[10px] font-semibold text-brand-gold transition duration-ui ease-ui hover:bg-brand-gold/25';

  return (
    <div className={`card-btn-group flex flex-wrap gap-1.5 ${compact ? 'mt-1.5' : 'mt-2'}`}>
      {hasCourier ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-brand/40 bg-brand/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand">
          <span aria-hidden>🛵</span> Kendi kurye
        </span>
      ) : null}
      {hasMenu && restaurantId ? (
        <Link href={`/restaurants/${restaurantId}#menu`} onClick={stopNav} className={menuClass}>
          <span aria-hidden>📋</span> Menu
        </Link>
      ) : null}
      {hasOffer ? (
        <span className="inline-flex rounded-full border border-success/40 bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">
          {offerText}
        </span>
      ) : null}
    </div>
  );
}
