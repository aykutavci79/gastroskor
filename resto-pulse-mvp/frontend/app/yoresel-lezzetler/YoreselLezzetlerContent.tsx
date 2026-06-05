'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { RegionalProductCard } from '@/components/RegionalProductCard';
import { listRegionalProducts } from '@/lib/api';
import type { RegionalProductItem } from '@/lib/types';

export function YoreselLezzetlerContent() {
  const searchParams = useSearchParams();
  const city = useMemo(() => searchParams.get('city')?.trim() || 'Bursa', [searchParams]);
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
    <main className="mx-auto max-w-5xl px-4 py-10">
      <Link href="/" className="text-sm text-content-muted hover:text-content">
        ← Ana sayfa
      </Link>
      <h1 className="mt-4 text-3xl font-bold text-content">{city} yöresel lezzetler</h1>
      <p className="mt-2 max-w-2xl text-sm text-content-muted">
        TÜRKPATENT Coğrafi İşaretler Portalı&apos;nda tescilli {city} yemekleri — {items.length || 12}{' '}
        lezzet. Bir ürüne tıklayın; 4.5+ puanlı restoran önerilerini yakından uzağa görün.
      </p>

      {loading ? <p className="mt-8 text-sm text-content-muted">Yükleniyor...</p> : null}

      <div className="mt-8 grid grid-cols-1 gap-4">
        {items.map((item) => (
          <RegionalProductCard
            key={item.slug}
            item={item}
            href={`/yoresel-lezzetler/${item.slug}?city=${encodeURIComponent(city)}`}
          />
        ))}
      </div>

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
    </main>
  );
}
