'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { CategoryScoresPanel } from '@/components/CategoryScoresPanel';
import { GeographicalIndicationBadge } from '@/components/GeographicalIndicationBadge';
import { MapsDirectionsButton } from '@/components/MapsDirectionsButton';
import { RestaurantPublicMenu } from '@/components/RestaurantPublicMenu';
import { RestaurantCategoryBadge } from '@/components/RestaurantCategoryBadge';
import { RestaurantPromoBadges } from '@/components/RestaurantPromoBadges';
import { RestaurantPromoLinks } from '@/components/RestaurantPromoLinks';
import { ReviewForm } from '@/components/ReviewForm';
import { ReviewList } from '@/components/ReviewList';
import { getRestaurant, listRestaurantReviews } from '@/lib/api';
import { aggregateCategoryScores } from '@/lib/scores';
import type { Restaurant, Review, ReviewAnalyzeResult } from '@/lib/types';

type Props = {
  restaurantId: string;
  initialRestaurant?: Restaurant | null;
  initialReviews?: Review[];
  initialError?: string | null;
};

export function RestaurantDetailView({
  restaurantId,
  initialRestaurant = null,
  initialReviews = [],
  initialError = null,
}: Props) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(initialRestaurant);
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [latestAnalysis, setLatestAnalysis] = useState<ReviewAnalyzeResult | null>(null);
  const [loading, setLoading] = useState(!initialRestaurant && !initialError);
  const [error, setError] = useState<string | null>(initialError);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [restaurantData, reviewData] = await Promise.all([
        getRestaurant(restaurantId),
        listRestaurantReviews(restaurantId),
      ]);
      setRestaurant(restaurantData);
      setReviews(reviewData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Veri yuklenemedi.';
      setError(
        message === 'Failed to fetch'
          ? 'API baglantisi kurulamadi. Backend (port 8000) calisiyor mu?'
          : message,
      );
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (!initialRestaurant && !initialError) {
      void load();
    }
  }, [initialRestaurant, initialError, load]);

  const categoryScores = useMemo(() => {
    if (latestAnalysis?.categories?.length) {
      return latestAnalysis.categories;
    }
    return aggregateCategoryScores(reviews);
  }, [latestAnalysis, reviews]);

  function handleReviewCreated(review: Review) {
    setReviews((prev) => [review, ...prev]);
  }

  function handleAnalyzed(result: ReviewAnalyzeResult) {
    setLatestAnalysis(result);
    setReviews((prev) =>
      prev.map((item) =>
        item.id === result.review_id
          ? {
              ...item,
              sentiment_label: result.sentiment_label,
              sentiment_score: result.sentiment_score,
              ai_summary: result.summary,
              categories: result.categories,
            }
          : item,
      ),
    );
  }

  if (loading) {
    return <p className="text-slate-400">Restoran yukleniyor...</p>;
  }

  if (error || !restaurant) {
    return (
      <div className="space-y-4">
        <p className="text-bad">{error ?? 'Restoran bulunamadi.'}</p>
        <Link href="/" className="text-accent hover:underline">
          Ana sayfaya don
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href="/" className="text-sm text-accent hover:underline">
          ← Restoran listesi
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold text-white">{restaurant.name}</h1>
          <RestaurantCategoryBadge
            category={restaurant.category}
            name={restaurant.name}
            menuItems={restaurant.menu}
            ownerEmoji={restaurant.card_emoji}
          />
        </div>
        <p className="mt-1 text-slate-400">
          {[restaurant.district, restaurant.city].filter(Boolean).join(' · ')}
        </p>
        {restaurant.address ? <p className="mt-1 text-sm text-slate-500">{restaurant.address}</p> : null}
        <div className="mt-3">
          <RestaurantPromoBadges promo={restaurant.promo} />
          <RestaurantPromoLinks promo={restaurant.promo} />
        </div>
      </div>

      {restaurant.promo?.menu_image_url && (!restaurant.menu || restaurant.menu.length === 0) ? (
        <section className="rounded-2xl border border-slate-700/70 bg-panel/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Menu</h2>
            <a
              href={restaurant.promo.menu_image_url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-accent/90">
              Menuyu goruntule
            </a>
          </div>
          <a
            href={restaurant.promo.menu_image_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block w-full overflow-hidden rounded-xl border border-slate-600">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={restaurant.promo.menu_image_url}
              alt={`${restaurant.name} menu`}
              className="max-h-96 w-full object-contain"
            />
          </a>
          <p className="mt-2 text-xs text-slate-500">
            Isletmenin yukledigi menu fotografi. Buyutmek icin gorsele veya ustteki dugmeye tiklayin.
          </p>
        </section>
      ) : null}

      {restaurant.menu && restaurant.menu.length > 0 ? (
        <RestaurantPublicMenu items={restaurant.menu} />
      ) : null}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Konum &amp; ürünler</h2>
          <MapsDirectionsButton
            mapsDirectionsUrl={restaurant.maps_directions_url ?? restaurant.maps_search_url}
          />
        </div>
        <GeographicalIndicationBadge
          hasGeographicalIndication={restaurant.has_geographical_indication}
          giProductName={restaurant.gi_product_name}
          geoIndications={restaurant.geo_indications ?? []}
        />
      </div>

      <CategoryScoresPanel
        categories={categoryScores}
        summary={latestAnalysis?.summary}
        sentimentLabel={latestAnalysis?.sentiment_label}
        sentimentScore={latestAnalysis?.sentiment_score}
      />

      <ReviewForm
        restaurantId={restaurantId}
        onReviewCreated={handleReviewCreated}
        onAnalyzed={handleAnalyzed}
      />

      <section>
        <h2 className="mb-4 text-xl font-semibold text-white">Yorumlar</h2>
        <ReviewList reviews={reviews} />
      </section>
    </div>
  );
}
