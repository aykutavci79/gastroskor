'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { RegionalProductCard } from '@/components/RegionalProductCard';
import { listRegionalProducts } from '@/lib/api';
import type { RegionalProductItem } from '@/lib/types';

export function RegionalFlavorTeaser() {
  const [items, setItems] = useState<RegionalProductItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listRegionalProducts({ city: 'Bursa' })
      .then((data) => {
        if (!cancelled) setItems(data.items.slice(0, 6));
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
  }, []);

  if (!ready || items.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-brand-gold">İç turizm</p>
          <h2 className="text-xl font-semibold text-content sm:text-2xl">Bursa yöresel lezzetler</h2>
          <p className="mt-1 text-sm text-content-muted">
            TÜRKPATENT&apos;te tescilli 12 Bursa lezzeti — tıklayınca canlı arama ile mekan keşfi.
          </p>
        </div>
        <Link
          href="/yoresel-lezzetler"
          className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-brand-gold hover:bg-amber-500/20">
          Tümünü gör
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {items.map((item) => (
          <RegionalProductCard
            key={item.slug}
            item={item}
            href={`/yoresel-lezzetler/${item.slug}?city=Bursa`}
          />
        ))}
      </div>
    </section>
  );
}
