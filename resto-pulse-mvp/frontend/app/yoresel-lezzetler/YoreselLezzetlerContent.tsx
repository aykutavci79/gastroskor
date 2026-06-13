'use client';

import { useEffect, useState } from 'react';

import { RegionalProductCard } from '@/components/RegionalProductCard';
import { listRegionalProducts } from '@/lib/api';
import type { RegionalProductItem } from '@/lib/types';

type Props = {
  city: string;
};

export function YoreselLezzetlerContent({ city }: Props) {
  const [items, setItems] = useState<RegionalProductItem[]>([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listRegionalProducts({ city })
      .then((data) => {
        if (cancelled) return;
        setItems(data.items);
        setNote(data.registry_note);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [city]);

  return (
    <>
      {loading ? <p className="mt-8 text-sm text-content-muted">Yükleniyor...</p> : null}

      {!loading ? (
        <section className="mt-8">
          <h2 className="text-xl font-semibold text-content">Tescilli yöresel lezzetler</h2>
          <div className="mt-4 grid grid-cols-1 gap-4">
            {items.map((item) => (
              <RegionalProductCard
                key={item.slug}
                item={item}
                href={`/yoresel-lezzetler/${item.slug}?city=${encodeURIComponent(city)}`}
              />
            ))}
          </div>
        </section>
      ) : null}

      {note ? (
        <p className="mt-8 text-xs text-content-muted">
          {note}{' '}
          <a
            href="https://ci.turkpatent.gov.tr/cografi-isaretler/liste?il=16&tur=&urunGrubu=51&adi="
            className="text-brand-gold underline"
            target="_blank"
            rel="noopener noreferrer">
            Resmi kaynak
          </a>
        </p>
      ) : null}
    </>
  );
}
