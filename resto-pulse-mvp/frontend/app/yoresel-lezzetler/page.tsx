'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { listRegionalProducts } from '@/lib/api';
import type { RegionalProductItem } from '@/lib/types';

export default function YoreselLezzetlerPage() {
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

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {items.map((item) => (
          <Link
            key={item.slug}
            href={`/yoresel-lezzetler/${item.slug}`}
            className="rounded-2xl border border-border/70 bg-surface-card p-5 transition hover:border-amber-500/40">
            <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-gold">
              Mahreç
            </span>
            <h2 className="mt-2 text-xl font-semibold text-content">{item.name}</h2>
            <p className="mt-1 text-xs text-content-muted">
              {item.region} · {item.registration_year} · {item.indication_type}
            </p>
            <p className="mt-3 text-sm text-content-muted">{item.summary}</p>
            <p className="mt-4 text-sm font-medium text-brand-gold">
              {item.restaurant_count > 0
                ? `${item.restaurant_count} restoran listeleniyor`
                : 'Yakında restoran eklenecek'}
            </p>
          </Link>
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
