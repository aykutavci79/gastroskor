import type { RestaurantPromoPublic } from '@/lib/types';

type Props = {
  promo: RestaurantPromoPublic | null | undefined;
  compact?: boolean;
};

export function RestaurantPromoBadges({ promo, compact = false }: Props) {
  if (!promo) return null;

  const hasCourier = promo.has_own_courier;
  const hasOffer = Boolean(promo.direct_order_text?.trim());

  if (!hasCourier && !hasOffer) return null;

  return (
    <div className={`flex flex-wrap gap-1.5 ${compact ? '' : 'mt-2'}`}>
      {hasCourier ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/40 bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-200">
          <span aria-hidden>🛵</span> Kendi kurye
        </span>
      ) : null}
      {hasOffer ? (
        <span className="inline-flex rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
          {promo.direct_order_text}
        </span>
      ) : null}
    </div>
  );
}
