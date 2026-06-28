'use client';

import { useEffect, useState } from 'react';

import {
  RegionalFlavorScrollGrid,
  RegionalFlavorScrollSkeleton,
} from '@/components/RegionalFlavorScrollGrid';
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
      {loading ? <RegionalFlavorScrollSkeleton large /> : null}

      {!loading && items.length > 0 ? (
        <section className="mt-4">
          <RegionalFlavorScrollGrid items={items} city={city} variant="home" />
        </section>
      ) : null}

      {!loading && items.length === 0 ? (
        <p className="mt-8 text-sm text-content-muted">{city} için yöresel ürün bulunamadı.</p>
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
