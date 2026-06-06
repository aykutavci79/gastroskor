'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { RegionalProductCard } from '@/components/RegionalProductCard';
import { listRegionalProducts } from '@/lib/api';
import type { RegionalProductItem } from '@/lib/types';

const CITY = 'Bursa';

type Props = {
  /** Ana sayfada bölüm yalnızca kullanıcı arama yaptıktan sonra gösterilir. */
  showProducts?: boolean;
};

export function RegionalFlavorTeaser({ showProducts = false }: Props) {
  const [items, setItems] = useState<RegionalProductItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!showProducts) return;

    let cancelled = false;
    setReady(false);
    listRegionalProducts({ city: CITY })
      .then((data) => {
        if (!cancelled) setItems(data.items.slice(0, 4));
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
  }, [showProducts]);

  if (!showProducts) return null;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-content sm:text-2xl">🏺 Yöresel Lezzetler</h2>
          <p className="mt-1 text-sm text-content-muted">
            Seçtiğiniz ilin coğrafi işaretli ürünleri
          </p>
        </div>
        <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-brand-gold">
          {CITY}
        </span>
      </div>

      {!ready ? <div className="h-24 animate-pulse rounded-2xl bg-surface-input" /> : null}

      {ready && items.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-3">
            {items.map((item) => (
              <RegionalProductCard
                key={item.slug}
                item={item}
                href={`/yoresel-lezzetler/${item.slug}?city=${CITY}`}
              />
            ))}
          </div>
          <Link
            href="/yoresel-lezzetler"
            className="inline-flex rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-brand-gold hover:bg-amber-500/20">
            Tüm Bursa lezzetleri
          </Link>
        </>
      ) : null}

      {ready && items.length === 0 ? (
        <p className="text-sm text-content-muted">Bu il için yöresel ürün bulunamadı.</p>
      ) : null}
    </section>
  );
}
