'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { RestaurantCard } from '@/components/RestaurantCard';
import { useDetectedCity } from '@/hooks/useDetectedCity';
import { listRegionalProductRestaurants } from '@/lib/api';
import type { RegionalProductItem, RestaurantListItem } from '@/lib/types';

export default function YoreselLezzetDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { coords } = useDetectedCity();
  const [product, setProduct] = useState<RegionalProductItem | null>(null);
  const [items, setItems] = useState<RestaurantListItem[]>([]);
  const [ratingNote, setRatingNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    listRegionalProductRestaurants(slug, {
      city: 'Bursa',
      origin_lat: coords?.lat,
      origin_lng: coords?.lng,
      min_rating: 4.5,
      limit: 30,
    })
      .then((data) => {
        if (cancelled) return;
        setProduct(data.product);
        setItems(data.items);
        if (data.rating_relaxed) {
          setRatingNote(`4.5+ sonuç yok; ${data.applied_min_rating}+ puanlı restoranlar gösteriliyor.`);
        } else {
          setRatingNote(`${data.applied_min_rating}+ puan, yakından uzağa sıralı.`);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProduct(null);
          setItems([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, coords?.lat, coords?.lng]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <Link href="/yoresel-lezzetler" className="text-sm text-content-muted hover:text-content">
        ← Yöresel lezzetler
      </Link>

      {loading ? <p className="mt-6 text-sm text-content-muted">Yükleniyor...</p> : null}

      {product ? (
        <>
          <h1 className="mt-4 text-3xl font-bold text-content">{product.name}</h1>
          <p className="mt-2 text-sm text-content-muted">
            {product.region} · {product.registration_year} · {product.indication_type}
          </p>
          <p className="mt-2 text-sm text-content-muted">{product.summary}</p>
          <a
            href={product.detail_url}
            className="mt-2 inline-block text-xs text-brand-gold underline"
            target="_blank"
            rel="noopener noreferrer">
            TÜRKPATENT tescil kaydı
          </a>
          {ratingNote ? <p className="mt-2 text-xs text-brand-gold">{ratingNote}</p> : null}

          {items.length === 0 ? (
            <p className="mt-8 rounded-2xl border border-border/70 bg-surface-card p-6 text-sm text-content-muted">
              Bu lezzet için henüz uygun restoran yok. Panelden mahreç etiketi eklenebilir.
            </p>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {items.map((restaurant) => (
                <RestaurantCard
                  key={restaurant.id}
                  restaurant={restaurant}
                  compact={false}
                  cornerBadge="🍽️ MAHREÇ"
                />
              ))}
            </div>
          )}
        </>
      ) : null}
    </main>
  );
}
