'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import {
  RegionalFlavorScrollGrid,
  RegionalFlavorScrollSkeleton,
} from '@/components/RegionalFlavorScrollGrid';
import type { CityDetectStatus } from '@/hooks/useDetectedCity';
import { listRegionalProducts } from '@/lib/api';
import { SUPPORTED_CITIES } from '@/lib/detect-city';
import type { RegionalProductItem } from '@/lib/types';

type Props = {
  city: string;
  cityStatus?: CityDetectStatus;
  onCityChange: (city: string) => void;
};

export function RegionalFlavorTeaser({ city, cityStatus = 'ready', onCityChange }: Props) {
  const [items, setItems] = useState<RegionalProductItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    listRegionalProducts({ city })
      .then((data) => {
        if (!cancelled) setItems(data.items);
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

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-content sm:text-lg">Yöresel Lezzetler</h2>
          <p className="mt-1 text-sm text-content-muted">Tescilli ürünler — isim + görsel</p>
        </div>
        <div className="flex items-center gap-2">
          {cityStatus === 'loading' ? (
            <span className="text-[11px] text-content-muted">Konum…</span>
          ) : null}
          <label className="sr-only" htmlFor="regional-teaser-city">
            İl seçin
          </label>
          <select
            id="regional-teaser-city"
            value={city}
            onChange={(event) => onCityChange(event.target.value)}
            className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-2.5 py-1.5 text-xs font-semibold text-brand-gold outline-none focus:border-amber-500/60">
            {SUPPORTED_CITIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!ready ? <RegionalFlavorScrollSkeleton /> : null}

      {ready && items.length > 0 ? (
        <>
          <RegionalFlavorScrollGrid items={items} city={city} />
          <Link
            href={`/yoresel-lezzetler?city=${encodeURIComponent(city)}`}
            className="inline-flex text-sm font-semibold text-brand-gold hover:underline">
            Tüm {city} lezzetleri →
          </Link>
        </>
      ) : null}

      {ready && items.length === 0 ? (
        <p className="text-sm text-content-muted">{city} için yöresel ürün bulunamadı.</p>
      ) : null}
    </section>
  );
}
