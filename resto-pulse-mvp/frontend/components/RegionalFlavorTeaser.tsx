'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import {
  RegionalFlavorScrollGrid,
  RegionalFlavorScrollSkeleton,
} from '@/components/RegionalFlavorScrollGrid';
import { ProvinceSelect } from '@/components/ProvinceSelect';
import type { CityDetectStatus } from '@/hooks/useDetectedCity';
import { listRegionalProducts } from '@/lib/api';
import { cityDisplayName } from '@/lib/turkiye-provinces';
import type { RegionalProductItem } from '@/lib/types';

type Props = {
  city: string;
  cityStatus?: CityDetectStatus;
  onCityChange: (city: string) => void;
};

export function RegionalFlavorTeaser({ city, cityStatus = 'ready', onCityChange }: Props) {
  const [items, setItems] = useState<RegionalProductItem[]>([]);
  const [ready, setReady] = useState(false);
  const cityLabel = cityDisplayName(city);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    listRegionalProducts({ city: cityLabel })
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
  }, [cityLabel]);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm text-content-muted">Tescilli ürünler — isim + görsel</p>
        <div className="w-full max-w-[240px] sm:w-auto">
          {cityStatus === 'loading' ? (
            <span className="mb-1 block text-[11px] text-content-muted">Konum…</span>
          ) : null}
          <ProvinceSelect
            id="regional-teaser-city"
            value={city}
            onChange={onCityChange}
            hideLabel
            className="w-full"
          />
        </div>
      </div>

      {!ready ? <RegionalFlavorScrollSkeleton /> : null}

      {ready && items.length > 0 ? (
        <>
          <RegionalFlavorScrollGrid items={items} city={cityLabel} />
          <Link
            href={`/yoresel-lezzetler?city=${encodeURIComponent(cityLabel)}`}
            className="inline-flex text-sm font-semibold text-brand-gold hover:underline">
            Tüm {cityLabel} lezzetleri →
          </Link>
        </>
      ) : null}

      {ready && items.length === 0 ? (
        <p className="text-sm text-content-muted">{cityLabel} için yöresel ürün bulunamadı.</p>
      ) : null}
    </section>
  );
}
