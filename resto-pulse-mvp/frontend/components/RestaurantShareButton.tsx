'use client';

import { useMemo, useState } from 'react';

import {
  buildRestaurantShareText,
  type RestaurantShareInput,
  whatsAppShareUrl,
} from '@/lib/restaurant-share';

type Props = {
  restaurant: RestaurantShareInput;
  googleRating?: number | null;
  gastroRating?: number | null;
  compact?: boolean;
};

export function RestaurantShareButton({ restaurant, googleRating, gastroRating, compact = false }: Props) {
  const [open, setOpen] = useState(false);
  const shareText = useMemo(
    () => buildRestaurantShareText(restaurant, { googleRating, gastroRating }),
    [restaurant, googleRating, gastroRating],
  );

  async function nativeShare() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ title: restaurant.name, text: shareText });
      setOpen(false);
      return;
    }
    await navigator.clipboard.writeText(shareText);
    setOpen(false);
    window.alert('Metin panoya kopyalandi.');
  }

  return (
    <>
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
          setOpen(true);
        }}>
        {compact ? '↗' : 'Paylaş'}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          onClick={() => setOpen(false)}
          role="presentation">
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-surface-panel p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Paylasim secenekleri">
            <h3 className="text-lg font-bold text-content">Kartı paylaş</h3>
            <p className="mt-1 text-sm text-content-muted">{restaurant.name}</p>
            <p className="mt-2 text-xs text-content-muted">
              Sistem Gurme odalarina restoran karti gonderilemez. WhatsApp, mesaj ve Instagram disinda
              paylasabilirsiniz.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <a
                href={whatsAppShareUrl(shareText)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-border bg-surface-input px-4 py-3 text-sm font-semibold text-content"
                onClick={() => setOpen(false)}>
                💬 WhatsApp
              </a>
              <button
                type="button"
                className="rounded-xl border border-border bg-surface-input px-4 py-3 text-left text-sm font-semibold text-content"
                onClick={() => void nativeShare()}>
                ✉️ Mesaj / DM / diger uygulamalar
              </button>
              <button
                type="button"
                className="rounded-xl border border-border bg-surface-input px-4 py-3 text-left text-sm font-semibold text-content"
                onClick={() => void nativeShare()}>
                📸 Instagram (paylasim menusu)
              </button>
            </div>
            <button
              type="button"
              className="mt-3 w-full py-2 text-sm font-semibold text-content-muted"
              onClick={() => setOpen(false)}>
              Vazgec
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
