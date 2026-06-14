'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { FoodCastTitle } from '@/components/FoodCastTitle';
import { HorizontalScrollPeek } from '@/components/HorizontalScrollPeek';
import { getFoodcastFeed } from '@/lib/api';
import type { FoodcastPhotoItem } from '@/lib/foodcast-types';
import { formatRelativeTimeTr } from '@/lib/relative-time-tr';

const FEED_LIMIT = 12;

type Props = {
  city: string;
};

function FoodCastTile({ item }: { item: FoodcastPhotoItem }) {
  return (
    <Link
      href={`/restaurants/${item.restaurant_id}`}
      className="group flex w-[11.5rem] shrink-0 snap-start flex-col gap-1.5 sm:w-[13rem] md:w-[15rem]">
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl border border-border/70 bg-surface-input">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.image_url}
          alt={`${item.dish_name} — ${item.restaurant_name}`}
          className="h-full w-full object-cover transition group-hover:scale-[1.02]"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
        />
      </div>
      <p className="truncate text-sm font-bold text-content group-hover:text-brand-gold">{item.dish_name}</p>
      <p className="truncate text-xs text-content-muted">{item.restaurant_name}</p>
      <p className="text-[11px] text-content-muted/80">
        {item.author_label} · {formatRelativeTimeTr(item.created_at)}
      </p>
    </Link>
  );
}

function LoadingStrip() {
  return (
    <div className="flex gap-3 overflow-x-hidden">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="w-[11.5rem] shrink-0 space-y-2 sm:w-[13rem] md:w-[15rem]">
          <div className="aspect-[4/5] animate-pulse rounded-xl bg-surface-input" />
          <div className="h-3 w-3/4 animate-pulse rounded bg-surface-input" />
          <div className="h-2.5 w-1/2 animate-pulse rounded bg-surface-input" />
        </div>
      ))}
    </div>
  );
}

export function FoodCastHomeSection({ city }: Props) {
  const [items, setItems] = useState<FoodcastPhotoItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    getFoodcastFeed({ city, limit: FEED_LIMIT })
      .then((feed) => {
        if (!cancelled) setItems(feed.items);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [city]);

  if (ready && items.length === 0) {
    return (
      <section className="space-y-3 rounded-2xl border border-border/70 bg-surface-card p-4 sm:p-5">
        <div>
          <FoodCastTitle />
          <p className="mt-1 text-sm text-content-muted">Gerçek tabaklar · restoran etiketli</p>
        </div>
        <p className="text-sm text-content-muted">
          {city} için henüz FoodCast paylaşımı yok. İlk tabağı mobil uygulamadan paylaş — keşfette burada görünür.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div>
        <FoodCastTitle />
        <p className="mt-1 text-sm text-content-muted">Gerçek tabaklar · restoran etiketli · {city}</p>
      </div>

      {!ready ? <LoadingStrip /> : null}

      {ready && items.length > 0 ? (
        <HorizontalScrollPeek className="flex gap-3">
          {items.map((item) => (
            <FoodCastTile key={item.id} item={item} />
          ))}
        </HorizontalScrollPeek>
      ) : null}
    </section>
  );
}
