'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { RestaurantCard } from '@/components/RestaurantCard';
import { useDetectedCity } from '@/hooks/useDetectedCity';
import { getRegionalProduct, searchLivePlaces } from '@/lib/api';
import { livePlaceDistanceLabel, livePlaceDetailHref, livePlaceToRestaurantCard } from '@/lib/live-place-card';
import type { LivePlaceSearchItem, RegionalProductItem } from '@/lib/types';

export function YoreselLezzetDetailContent() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const slug = params.slug;
  const city = useMemo(() => searchParams.get('city')?.trim() || 'Bursa', [searchParams]);
  const { coords } = useDetectedCity();
  const [product, setProduct] = useState<RegionalProductItem | null>(null);
  const [discoveryNote, setDiscoveryNote] = useState<string | null>(null);
  const [liveItems, setLiveItems] = useState<LivePlaceSearchItem[]>([]);
  const [searchNote, setSearchNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    getRegionalProduct(slug, { city })
      .then(async (detail) => {
        if (cancelled) return;
        setProduct(detail.product);
        setDiscoveryNote(detail.discovery_note);
        setSearchNote(null);
        setLiveItems([]);

        try {
          const live = await searchLivePlaces({
            q: detail.product.live_search_query,
            city,
            limit: 20,
            origin_lat: coords?.lat,
            origin_lng: coords?.lng,
          });
          if (cancelled) return;
          setLiveItems(live.items);
          setSearchNote(
            live.items.length > 0
              ? `Google canlı arama: "${detail.product.live_search_query}" · puana, yorum sayısına ve mesafeye göre sıralı.`
              : `"${detail.product.live_search_query}" için sonuç bulunamadı.`,
          );
        } catch (liveErr) {
          if (cancelled) return;
          setLiveItems([]);
          setSearchNote(
            liveErr instanceof Error ? liveErr.message : 'Canlı arama şu an kullanılamıyor.',
          );
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setProduct(null);
          setLiveItems([]);
          setError(err instanceof Error ? err.message : 'Ürün bilgisi alınamadı.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, city, coords?.lat, coords?.lng]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <Link
        href={`/yoresel-lezzetler?city=${encodeURIComponent(city)}`}
        className="text-sm text-content-muted hover:text-content">
        ← Yöresel lezzetler
      </Link>

      {loading ? <p className="mt-6 text-sm text-content-muted">Yükleniyor...</p> : null}
      {error ? <p className="mt-6 text-sm text-rose-400">{error}</p> : null}

      {product ? (
        <>
          <div className="mt-4 flex flex-col gap-4 overflow-hidden rounded-2xl border border-border/70 bg-surface-card sm:flex-row">
            <div className="min-w-0 flex-1 p-5 sm:p-6">
              <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-gold self-start">
                TÜRKPATENT tescilli ürün
              </span>
              <h1 className="mt-3 text-3xl font-bold text-content">{product.name}</h1>
              <p className="mt-2 text-sm text-content-muted">
                {product.region} · {product.registration_year} · {product.indication_type}
              </p>
              <p className="mt-3 text-sm text-content-muted">{product.summary}</p>
              <a
                href={product.detail_url}
                className="mt-3 inline-block text-xs text-brand-gold underline"
                target="_blank"
                rel="noopener noreferrer">
                Resmi tescil kaydı (TÜRKPATENT)
              </a>
            </div>
            {product.image_url ? (
              <div className="relative h-48 w-full shrink-0 border-t border-border/40 sm:h-auto sm:w-56 sm:border-l sm:border-t-0 md:w-72">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : null}
          </div>

          {discoveryNote ? (
            <p className="mt-4 rounded-xl border border-border/60 bg-surface-input/40 p-4 text-xs text-content-muted">
              {discoveryNote}
            </p>
          ) : null}

          {searchNote ? <p className="mt-4 text-xs text-brand-gold">{searchNote}</p> : null}

          {liveItems.length === 0 && !loading ? (
            <p className="mt-8 rounded-2xl border border-border/70 bg-surface-card p-6 text-sm text-content-muted">
              Bu lezzet için canlı arama sonucu bulunamadı. Ana sayfadaki aramayı da deneyebilirsiniz.
            </p>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {liveItems.map((item) => (
                <RestaurantCard
                  key={item.place_id}
                  restaurant={livePlaceToRestaurantCard(item)}
                  compact={false}
                  distanceLabel={livePlaceDistanceLabel(item)}
                  googleRating={item.rating}
                  googleReviewCount={item.user_ratings_total}
                  distanceMeters={item.distance_meters}
                  mapsDirectionsUrl={item.maps_directions_url}
                  href={livePlaceDetailHref(item)}
                />
              ))}
            </div>
          )}
        </>
      ) : null}
    </main>
  );
}
