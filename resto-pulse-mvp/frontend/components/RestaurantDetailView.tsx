'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { CategoryScoresPanel } from '@/components/CategoryScoresPanel';
import { GeographicalIndicationBadge } from '@/components/GeographicalIndicationBadge';
import { MapsDirectionsButton } from '@/components/MapsDirectionsButton';
import { RestaurantPhotoCarousel } from '@/components/RestaurantPhotoCarousel';
import { RestaurantPublicMenu } from '@/components/RestaurantPublicMenu';
import { RestaurantCategoryBadge } from '@/components/RestaurantCategoryBadge';
import { RestaurantPromoBadges } from '@/components/RestaurantPromoBadges';
import { RestaurantPromoLinks } from '@/components/RestaurantPromoLinks';
import { RestaurantShareButton } from '@/components/RestaurantShareButton';
import { OpenInAppLink } from '@/components/OpenInAppLink';
import { ReviewForm } from '@/components/ReviewForm';
import { ReviewList } from '@/components/ReviewList';
import { getLivePlaceDetails, getRestaurant, listRestaurantReviews, syncUser } from '@/lib/api';
import { googleCardPhotosEnabled } from '@/lib/google-card-photos';
import { aggregateCategoryScores } from '@/lib/scores';
import { restaurantPageHeading, restaurantSectionHeading } from '@/lib/seo-title';
import type { Restaurant, Review, ReviewAnalyzeResult, UserProfile } from '@/lib/types';

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
  const { data: session } = useSession();
  const viewerEmail = session?.user?.email ?? null;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(initialRestaurant);
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [latestAnalysis, setLatestAnalysis] = useState<ReviewAnalyzeResult | null>(null);
  const [loading, setLoading] = useState(!initialRestaurant && !initialError);
  const [error, setError] = useState<string | null>(initialError);

  const loadGallery = useCallback(async (restaurantData: Restaurant) => {
    const gallery: string[] = [];
    const cover =
      restaurantData.promo?.card_cover_image_url?.trim() ||
      restaurantData.promo?.menu_image_url?.trim();
    if (cover) gallery.push(cover);

    if (googleCardPhotosEnabled() && restaurantData.google_place_id) {
      try {
        const live = await getLivePlaceDetails(restaurantData.google_place_id);
        for (const url of live.photo_urls ?? []) {
          if (!gallery.includes(url)) gallery.push(url);
        }
      } catch {
        // Google fotolari opsiyonel
      }
    }
    setPhotoUrls(gallery);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [restaurantData, reviewData] = await Promise.all([
        getRestaurant(restaurantId),
        listRestaurantReviews(restaurantId, viewerEmail),
      ]);
      setRestaurant(restaurantData);
      setReviews(reviewData);
      await loadGallery(restaurantData);
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
  }, [restaurantId, loadGallery, viewerEmail]);

  useEffect(() => {
    if (!viewerEmail) {
      setProfile(null);
      return;
    }
    syncUser({
      email: viewerEmail,
      full_name: session?.user?.name ?? null,
      avatar_url: session?.user?.image ?? null,
      google_sub: (session?.user as { id?: string } | undefined)?.id ?? null,
    })
      .then(setProfile)
      .catch(() => setProfile(null));
  }, [viewerEmail, session?.user?.name, session?.user?.image, session?.user]);

  useEffect(() => {
    if (initialRestaurant) {
      void loadGallery(initialRestaurant);
    }
    if (!initialError) {
      void load();
    }
  }, [initialRestaurant, initialError, load, loadGallery, viewerEmail]);

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
    return <p className="text-content-muted">Restoran yukleniyor...</p>;
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

  const sectionHeading = (section: string) =>
    restaurantSectionHeading(
      restaurant.name,
      section,
      restaurant.district,
      restaurant.city,
      restaurant.address,
    );

  return (
    <div className="space-y-8">
      {photoUrls.length > 0 || restaurant.google_place_id ? (
        <RestaurantPhotoCarousel photos={photoUrls} restaurantName={restaurant.name} />
      ) : null}

      <div>
        <Link href="/" className="text-sm text-accent hover:underline">
          ← Restoran listesi
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold text-content">
            {restaurantPageHeading(
              restaurant.name,
              restaurant.district,
              restaurant.city,
              restaurant.address,
            )}
          </h1>
          <RestaurantCategoryBadge
            category={restaurant.category}
            name={restaurant.name}
            menuItems={restaurant.menu}
            ownerEmoji={restaurant.card_emoji}
          />
        </div>
        <p className="mt-1 text-content-muted">
          {[restaurant.district, restaurant.city].filter(Boolean).join(' · ')}
        </p>
        {restaurant.address ? <p className="mt-1 text-sm text-content-muted">{restaurant.address}</p> : null}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <RestaurantShareButton
            restaurant={{
              id: restaurant.id,
              name: restaurant.name,
              city: restaurant.city,
              district: restaurant.district,
              avg_rating: restaurant.avg_rating,
              google_rating: restaurant.google_rating,
              restaurant_id: restaurant.id,
              google_place_id: restaurant.google_place_id,
            }}
            googleRating={restaurant.google_rating}
            gastroRating={restaurant.avg_rating}
          />
          <OpenInAppLink restaurantId={restaurant.id} />
          <RestaurantPromoBadges promo={restaurant.promo} />
          <RestaurantPromoLinks promo={restaurant.promo} />
        </div>
      </div>

      {restaurant.promo?.menu_image_url && (!restaurant.menu || restaurant.menu.length === 0) ? (
        <section id="menu" className="scroll-mt-24 rounded-2xl border border-border/70 bg-surface-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-content-muted">
              {sectionHeading('menü')}
            </h2>
            <a
              href={restaurant.promo.menu_image_url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent-hover">
              Menuyu goruntule
            </a>
          </div>
          <a
            href={restaurant.promo.menu_image_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block w-full overflow-hidden rounded-xl border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={restaurant.promo.menu_image_url}
              alt={`${restaurant.name} menü fotoğrafı`}
              width={800}
              height={384}
              className="max-h-96 w-full object-contain"
            />
          </a>
          <p className="mt-2 text-xs text-content-muted">
            Isletmenin yukledigi menu fotografi. Buyutmek icin gorsele veya ustteki dugmeye tiklayin.
          </p>
        </section>
      ) : null}

      {restaurant.menu && restaurant.menu.length > 0 ? (
        <div id="menu" className="scroll-mt-24">
          <RestaurantPublicMenu
            items={restaurant.menu}
            restaurantName={restaurant.name}
            district={restaurant.district}
            city={restaurant.city}
            address={restaurant.address}
          />
        </div>
      ) : null}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-content-muted">
            {sectionHeading('konum ve tescilli ürünler')}
          </h2>
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
        heading={sectionHeading('GastroSkor skorları')}
      />

      <ReviewForm
        restaurantId={restaurantId}
        onReviewCreated={handleReviewCreated}
        onAnalyzed={handleAnalyzed}
        heading={sectionHeading('yorum yaz')}
      />

      <section>
        <h2 className="mb-4 text-xl font-semibold text-content">{sectionHeading('yorumlar')}</h2>
        <ReviewList
          reviews={reviews}
          viewerEmail={viewerEmail}
          viewerUserId={profile?.id ?? null}
          onReviewChange={(updated) =>
            setReviews((prev) => prev.map((row) => (row.id === updated.id ? updated : row)))
          }
          onReviewDelete={(reviewId) => setReviews((prev) => prev.filter((row) => row.id !== reviewId))}
        />
      </section>
    </div>
  );
}
