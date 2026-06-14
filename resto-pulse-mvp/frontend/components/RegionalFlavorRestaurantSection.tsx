'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { FeaturedCompactCard } from '@/components/FeaturedCompactCard';
import { HorizontalScrollPeek } from '@/components/HorizontalScrollPeek';
import { useDetectedCity } from '@/hooks/useDetectedCity';
import {
  livePlaceDetailHref,
  livePlaceDistanceLabel,
  livePlaceToRestaurantCard,
} from '@/lib/live-place-card';
import { searchRegionalFlavorPlaces } from '@/lib/regional-flavor-live-search';
import type { LivePlaceSearchItem, RegionalProductItem } from '@/lib/types';

type Props = {
  product: RegionalProductItem;
  city: string;
  heading?: string;
};

export function RegionalFlavorRestaurantSection({ product, city, heading }: Props) {
  const { coords } = useDetectedCity();
  const [liveItems, setLiveItems] = useState<LivePlaceSearchItem[]>([]);
  const [searchNote, setSearchNote] = useState<string | null>(null);
  const [searchLabel, setSearchLabel] = useState('');
  const [loading, setLoading] = useState(true);

  const sectionTitle = heading ?? `${product.name} sunan restoranlar`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSearchNote(null);
    setSearchLabel('');

    searchRegionalFlavorPlaces({
      liveSearchQuery: product.live_search_query,
      city,
      limit: 20,
      origin_lat: coords?.lat,
      origin_lng: coords?.lng,
    })
      .then((result) => {
        if (cancelled) return;
        setLiveItems(result.items);
        setSearchLabel(result.displayLabel);
        setSearchNote(result.searchNote);
      })
      .catch((liveErr) => {
        if (cancelled) return;
        setLiveItems([]);
        setSearchNote(liveErr instanceof Error ? liveErr.message : 'Canlı arama şu an kullanılamıyor.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [product.live_search_query, city, coords?.lat, coords?.lng]);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-content">{sectionTitle}</h2>
        <p className="mt-1 text-sm text-content-muted">
          Google canlı arama
          {searchLabel ? (
            <>
              {' '}
              — kullanıcı &quot;{searchLabel}&quot; yazmış gibi sonuçlar.
            </>
          ) : (
            ' — canlı mekan sonuçları.'
          )}
        </p>
      </div>

      {loading ? <p className="text-sm text-content-muted">Restoranlar aranıyor…</p> : null}
      {!loading && searchNote ? <p className="text-xs text-brand-gold">{searchNote}</p> : null}

      {!loading && liveItems.length > 0 ? (
        <HorizontalScrollPeek edgeBleed className="featured-compact-scroll">
          {liveItems.map((item) => (
            <FeaturedCompactCard
              key={item.place_id}
              restaurant={livePlaceToRestaurantCard(item)}
              href={livePlaceDetailHref(item)}
              distanceLabel={livePlaceDistanceLabel(item)}
              googleRating={item.rating}
            />
          ))}
        </HorizontalScrollPeek>
      ) : null}

      {!loading && liveItems.length === 0 ? (
        <p className="rounded-2xl border border-border/70 bg-surface-card p-6 text-sm text-content-muted">
          Bu lezzet için canlı arama sonucu bulunamadı.{' '}
          <Link href="/#canli-ara" className="text-brand-gold underline">
            Ana sayfada aramayı dene
          </Link>
        </p>
      ) : null}
    </section>
  );
}
