'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { RegionalFlavorFaq } from '@/components/RegionalFlavorFaq';
import { RestaurantCard } from '@/components/RestaurantCard';
import { useDetectedCity } from '@/hooks/useDetectedCity';
import { getRegionalProduct, searchLivePlaces } from '@/lib/api';
import { livePlaceDistanceLabel, livePlaceDetailHref, livePlaceToRestaurantCard } from '@/lib/live-place-card';
import type { RegionalFlavorPageContent } from '@/lib/regional-flavor-page-content';
import {
  resolveRegionalFlavorH1,
  resolveRegionalFlavorRestaurantTitle,
} from '@/lib/regional-flavor-page-content';
import type { LivePlaceSearchItem, RegionalProductItem, RestaurantListItem } from '@/lib/types';

type Props = {
  pageContent?: RegionalFlavorPageContent | null;
  initialProduct?: RegionalProductItem | null;
  gastroRestaurants?: RestaurantListItem[];
  gastroMatchedByTag?: boolean;
};

export function YoreselLezzetDetailContent({
  pageContent = null,
  initialProduct = null,
  gastroRestaurants = [],
  gastroMatchedByTag = false,
}: Props) {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const slug = params.slug;
  const city = useMemo(() => searchParams.get('city')?.trim() || pageContent?.city || 'Bursa', [searchParams, pageContent?.city]);
  const { coords } = useDetectedCity();
  const [product, setProduct] = useState<RegionalProductItem | null>(initialProduct);
  const [discoveryNote, setDiscoveryNote] = useState<string | null>(null);
  const [liveItems, setLiveItems] = useState<LivePlaceSearchItem[]>([]);
  const [searchNote, setSearchNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!initialProduct);

  const useTemplate = Boolean(pageContent);

  useEffect(() => {
    if (initialProduct && initialProduct.slug === slug) {
      setProduct(initialProduct);
      setLoading(false);
      return;
    }

    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    getRegionalProduct(slug, { city })
      .then((detail) => {
        if (cancelled) return;
        setProduct(detail.product);
        setDiscoveryNote(detail.discovery_note);
      })
      .catch((err) => {
        if (!cancelled) {
          setProduct(null);
          setError(err instanceof Error ? err.message : 'Ürün bilgisi alınamadı.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, city, initialProduct]);

  const gastroGooglePlaceIds = useMemo(() => {
    return new Set(
      gastroRestaurants.map((restaurant) => restaurant.google_place_id).filter((id): id is string => Boolean(id)),
    );
  }, [gastroRestaurants]);

  const googleLiveItems = useMemo(() => {
    return liveItems.filter((item) => !gastroGooglePlaceIds.has(item.place_id));
  }, [liveItems, gastroGooglePlaceIds]);

  useEffect(() => {
    if (!product) return;
    let cancelled = false;
    setSearchNote(null);
    setLiveItems([]);

    searchLivePlaces({
      q: product.live_search_query,
      city,
      limit: 20,
      origin_lat: coords?.lat,
      origin_lng: coords?.lng,
    })
      .then((live) => {
        if (cancelled) return;
        setLiveItems(live.items);
        setSearchNote(
          live.items.length > 0
            ? `Google canlı arama: "${product.live_search_query}" · puana, yorum sayısına ve mesafeye göre sıralı.`
            : `"${product.live_search_query}" için sonuç bulunamadı.`,
        );
      })
      .catch((liveErr) => {
        if (cancelled) return;
        setLiveItems([]);
        setSearchNote(liveErr instanceof Error ? liveErr.message : 'Canlı arama şu an kullanılamıyor.');
      });

    return () => {
      cancelled = true;
    };
  }, [product, city, coords?.lat, coords?.lng]);

  if (useTemplate && pageContent) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
        <nav aria-label="Breadcrumb" className="text-sm text-content-muted">
          <ol className="flex flex-wrap items-center gap-1">
            <li>
              <Link href="/" className="hover:text-content">
                Ana Sayfa
              </Link>
            </li>
            <li aria-hidden className="text-content-muted/60">
              ›
            </li>
            <li>
              <Link href={`/yoresel-lezzetler?city=${encodeURIComponent(city)}`} className="hover:text-content">
                Yöresel Lezzetler
              </Link>
            </li>
            <li aria-hidden className="text-content-muted/60">
              ›
            </li>
            <li className="text-content">{pageContent.name}</li>
          </ol>
        </nav>

        {loading && !product ? <p className="mt-6 text-sm text-content-muted">Yükleniyor...</p> : null}
        {error ? <p className="mt-6 text-sm text-rose-400">{error}</p> : null}

        {product ? (
          <div className="mt-6 space-y-8">
            <section className="overflow-hidden rounded-2xl border border-border/70 bg-surface-card">
              <div className="flex flex-col md:flex-row">
                {product.image_url ? (
                  <div className="relative h-52 w-full shrink-0 md:h-auto md:w-80 lg:w-96">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : null}
                <div className="min-w-0 flex-1 p-5 sm:p-6">
                  <span className="inline-flex rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    Tescilli ürün
                  </span>
                  <h1 className="mt-3 text-2xl font-bold text-content sm:text-3xl">{resolveRegionalFlavorH1(pageContent)}</h1>
                  <p className="mt-2 text-sm text-content-muted">
                    {pageContent.kategori} · {pageContent.tescilYili} · {product.indication_type}
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <p className="text-sm leading-relaxed text-content-muted">{pageContent.kisaTarih}</p>
              <a
                href={product.detail_url}
                className="inline-block text-xs text-brand-gold underline"
                target="_blank"
                rel="noopener noreferrer">
                Resmi tescil kaydı (TÜRKPATENT)
              </a>
            </section>

            <section className="rounded-2xl border border-border/70 bg-surface-input/40 p-5">
              <h2 className="text-lg font-semibold text-content">{pageContent.name} — ürün bilgisi</h2>
              <p className="mt-2 text-sm leading-relaxed text-content-muted">{pageContent.urunBilgisi}</p>
            </section>

            <section className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-content">
                    {resolveRegionalFlavorRestaurantTitle(pageContent)}
                  </h2>
                  <p className="mt-1 text-sm text-content-muted">
                    GastroSkor veritabanındaki mekanlar — gastro skoruna göre sıralı.
                    {!gastroMatchedByTag && gastroRestaurants.length > 0
                      ? ' Bu lezzet için doğrudan eşleşme az; genel Bursa listesi gösteriliyor.'
                      : null}
                  </p>
                </div>
                <Link
                  href={pageContent.seeAllHref}
                  className="inline-flex shrink-0 items-center justify-center rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover">
                  Tümünü Gör
                </Link>
              </div>

              {gastroRestaurants.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {gastroRestaurants.map((restaurant, index) => (
                    <RestaurantCard
                      key={restaurant.id}
                      restaurant={restaurant}
                      rank={index + 1}
                      compact
                      href={`/restaurants/${restaurant.id}`}
                    />
                  ))}
                </div>
              ) : (
                <p className="rounded-2xl border border-border/70 bg-surface-card p-6 text-sm text-content-muted">
                  Henüz bu lezzet için kayıtlı restoran bulunamadı. Yakında yeni mekanlar eklenecek.
                </p>
              )}
            </section>

            <section className="space-y-4 border-t border-border/50 pt-8">
              <div>
                <h2 className="text-xl font-semibold text-content">
                  {pageContent.name} — Google&apos;da daha fazla mekan
                </h2>
                <p className="mt-1 text-sm text-content-muted">
                  GastroSkor veritabanına henüz eklenmemiş mekanlar — Google canlı arama ile
                  &quot;{product.live_search_query}&quot; sorgusu.
                </p>
              </div>

              {searchNote ? <p className="text-xs text-brand-gold">{searchNote}</p> : null}

              {googleLiveItems.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {googleLiveItems.map((item) => (
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
              ) : !loading && product ? (
                <p className="rounded-2xl border border-border/70 bg-surface-card p-6 text-sm text-content-muted">
                  Bu sorgu için Google canlı arama sonucu bulunamadı. Ana sayfadaki aramayı da deneyebilirsiniz.
                </p>
              ) : null}
            </section>

            <RegionalFlavorFaq items={pageContent.faq} heading={`${pageContent.name} — sık sorulan sorular`} />
          </div>
        ) : null}
      </main>
    );
  }

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
              <span className="self-start rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-gold">
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
