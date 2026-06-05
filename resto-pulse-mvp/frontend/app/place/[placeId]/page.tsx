'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

import { LivePlaceDetailPanel } from '@/components/LivePlaceDetailPanel';
import { parseLiveScoreSearchParams } from '@/lib/live-place-card';
import type { LivePlaceSearchItem } from '@/lib/types';

export default function PlaceDetailPage() {
  const params = useParams<{ placeId: string }>();
  const searchParams = useSearchParams();
  const placeId = decodeURIComponent(params.placeId ?? '');

  const selectedItem = useMemo((): LivePlaceSearchItem | null => {
    const scores = parseLiveScoreSearchParams(searchParams);
    if (!scores || !placeId) return null;
    return {
      place_id: placeId,
      name: '',
      address: null,
      rating: scores.rating,
      user_ratings_total: null,
      latitude: null,
      longitude: null,
      gastro_score: scores.gastro_score,
      distance_score: scores.distance_score,
      rating_score: scores.rating_score,
      distance_meters: scores.distance_meters,
      distance_origin: scores.distance_origin,
      restaurant_id: null,
      maps_directions_url: null,
      google_photo_url: null,
      is_premium_partner: false,
      promo: null,
      menu_preview: [],
      menu_item_count: 0,
      card_emoji: null,
      member_avg_rating: null,
    };
  }, [placeId, searchParams]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/" className="text-sm text-content-muted hover:text-content">
        ← Ana sayfa
      </Link>
      <div className="mt-6">
        <LivePlaceDetailPanel placeId={placeId} selectedItem={selectedItem} />
      </div>
    </main>
  );
}
