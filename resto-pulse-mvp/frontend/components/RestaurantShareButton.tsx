'use client';

import { useMemo } from 'react';

import { buildRestaurantShareText, type RestaurantShareInput } from '@/lib/restaurant-share';

type Props = {
  restaurant: RestaurantShareInput;
  googleRating?: number | null;
  gastroRating?: number | null;
  compact?: boolean;
};

export function RestaurantShareButton({ restaurant, googleRating, gastroRating, compact = false }: Props) {
  const shareText = useMemo(
    () => buildRestaurantShareText(restaurant, { googleRating, gastroRating }),
    [restaurant, googleRating, gastroRating],
  );

  async function shareCard() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: restaurant.name, text: shareText });
        return;
      } catch {
        /* iptal */
      }
    }
    await navigator.clipboard.writeText(shareText);
    window.alert('Metin panoya kopyalandi.');
  }

  return (
    <button
      type="button"
      className={
        compact
          ? 'rounded-lg border border-accent/40 bg-accent/10 px-2 py-1 text-xs font-bold text-accent'
          : 'rounded-xl border border-accent bg-accent/15 px-3 py-2 text-sm font-bold text-accent'
      }
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void shareCard();
      }}>
      {compact ? '↗' : 'Paylaş'}
    </button>
  );
}
