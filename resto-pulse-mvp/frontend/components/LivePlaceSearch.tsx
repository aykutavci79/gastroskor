'use client';

import { FormEvent, useEffect, useState } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';

import { ReviewList } from '@/components/ReviewList';
import { RestaurantPhotoCarousel } from '@/components/RestaurantPhotoCarousel';
import { RestaurantCard } from '@/components/RestaurantCard';
import { createReview, getLivePlaceDetails, listRestaurantReviews, searchLivePlaces, syncUser } from '@/lib/api';
import { livePlaceDistanceLabel, livePlaceToRestaurantCard } from '@/lib/live-place-card';
import { DISTANCE_BAND_OPTIONS, RATING_BAND_OPTIONS, type DistanceBand, type RatingBand } from '@/lib/search-filters';
import type {
  LivePlaceDetails,
  LivePlaceSearchItem,
  ParsedSearchIntent,
  ReviewSortOption,
  ReviewFilterOption,
  Review,
  UserProfile,
} from '@/lib/types';

export function LivePlaceSearch() {
  const [q, setQ] = useState('');
  const [city] = useState('Bursa');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<LivePlaceSearchItem[]>([]);
  const [details, setDetails] = useState<LivePlaceDetails | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [activePlaceId, setActivePlaceId] = useState<string | null>(null);
  const [reviewSort, setReviewSort] = useState<ReviewSortOption>('newest');
  const [reviewFilter, setReviewFilter] = useState<ReviewFilterOption>('all');
  const [activeTab, setActiveTab] = useState<'google' | 'member' | 'gastro'>('google');
  const [memberRating, setMemberRating] = useState(5);
  const [memberReviewText, setMemberReviewText] = useState('');
  const [memberLoading, setMemberLoading] = useState(false);
  const [gsReviews, setGsReviews] = useState<Review[]>([]);
  const [gsReviewsLoading, setGsReviewsLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'ready' | 'denied'>('idle');
  const [lastDistanceOrigin, setLastDistanceOrigin] = useState<'user' | 'city_center' | null>(null);
  const [distanceBand, setDistanceBand] = useState<DistanceBand>('');
  const [ratingBand, setRatingBand] = useState<RatingBand>('');
  const [parsedIntent, setParsedIntent] = useState<ParsedSearchIntent | null>(null);
  const [selectedItem, setSelectedItem] = useState<LivePlaceSearchItem | null>(null);
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';

  function requestUserCoords(): Promise<{ lat: number; lng: number } | null> {
    if (!navigator.geolocation) {
      setLocationStatus('denied');
      return Promise.resolve(null);
    }
    setLocationStatus('loading');
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserCoords(coords);
          setLocationStatus('ready');
          resolve(coords);
        },
        () => {
          setUserCoords(null);
          setLocationStatus('denied');
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
      );
    });
  }

  function formatDistance(meters: number | null): string {
    if (meters == null) return '-';
    if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
    return `${Math.round(meters)} m`;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const query = q.trim();
    if (!query) {
      setItems([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const coords = await requestUserCoords();
      const result = await searchLivePlaces({
        q: query,
        city,
        limit: 8,
        origin_lat: coords?.lat,
        origin_lng: coords?.lng,
        distance_band: distanceBand || undefined,
        rating_band: ratingBand || undefined,
      });
      setParsedIntent(result.parsed);
      setLastDistanceOrigin(result.items[0]?.distance_origin ?? (coords ? 'user' : 'city_center'));
      setItems(result.items);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Canli arama sirasinda hata olustu.';
      setError(message);
      setItems([]);
      setDetails(null);
      setActivePlaceId(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isAuthenticated || !session?.user?.email) {
      return;
    }

    const googleSub = (session.user as { id?: string } | undefined)?.id;
    syncUser({
      email: session.user.email,
      full_name: session.user.name ?? null,
      avatar_url: session.user.image ?? null,
      google_sub: googleSub ?? null,
    })
      .then((result) => setProfile(result))
      .catch(() => setProfile(null));
  }, [isAuthenticated, session]);

  useEffect(() => {
    if (activeTab !== 'member' || !details?.restaurant_id) {
      return;
    }
    let cancelled = false;
    setGsReviewsLoading(true);
    listRestaurantReviews(details.restaurant_id, session?.user?.email ?? null)
      .then((rows) => {
        if (!cancelled) setGsReviews(rows);
      })
      .catch(() => {
        if (!cancelled) setGsReviews([]);
      })
      .finally(() => {
        if (!cancelled) setGsReviewsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, details?.restaurant_id, session?.user?.email]);

  function showDetails(place_id: string) {
    setActivePlaceId(place_id);
    setDetails(null);
    setDetailsError(null);
    setDetailsLoading(true);
    setReviewSort('newest');
    setReviewFilter('all');
    setActiveTab('google');

    getLivePlaceDetails(place_id, { sort: 'newest', filter: 'all' })
      .then((result) => setDetails(result))
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Detaylar getirilirken hata olustu.';
        if (message.toLowerCase().includes('failed to fetch')) {
          setDetailsError(
            'Backend baglantisi kurulamadi. Canli API (NEXT_PUBLIC_API_URL) ayarini ve sunucuyu kontrol edin.',
          );
        } else {
          setDetailsError(message);
        }
      })
      .finally(() => setDetailsLoading(false));
  }

  function onReviewFilterChange(sort: ReviewSortOption, filter: ReviewFilterOption) {
    setReviewSort(sort);
    setReviewFilter(filter);
    setDetailsLoading(true);

    getLivePlaceDetails(activePlaceId!, { sort, filter })
      .then((result) => setDetails(result))
      .catch((err) => {
        setDetailsError(err instanceof Error ? err.message : 'Filtre uygulanirken hata olustu.');
      })
      .finally(() => setDetailsLoading(false));
  }

  async function submitMemberReview(event: FormEvent) {
    event.preventDefault();
    if (!details?.restaurant_id) {
      setDetailsError('Bu restoran veritabanina kayitli degil, GastroSkor yorumlari eklenemiyor.');
      return;
    }

    if (!session?.user?.email) {
      setDetailsError('Uye olmadan yorum ekleyemezsiniz. Lutfen Google ile giris yapin.');
      return;
    }

    setMemberLoading(true);
    setDetailsError(null);

    try {
      await createReview({
        restaurant_id: details.restaurant_id,
        rating: memberRating,
        review_text: memberReviewText,
        author_id: profile?.id ?? undefined,
        author_email: session.user.email,
        author_name: session.user.name ?? undefined,
        author_avatar_url: session.user.image ?? undefined,
      });

      setMemberReviewText('');
      setMemberRating(5);

      const [refreshed, reviewRows] = await Promise.all([
        getLivePlaceDetails(activePlaceId!, {
          sort: reviewSort,
          filter: reviewFilter,
        }),
        listRestaurantReviews(details.restaurant_id, session.user.email),
      ]);
      setDetails(refreshed);
      setGsReviews(reviewRows);
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : 'Uye yorumu kaydedilirken hata olustu.');
    } finally {
      setMemberLoading(false);
    }
  }

  function closeDetails() {
    setActivePlaceId(null);
    setSelectedItem(null);
    setDetails(null);
    setDetailsError(null);
  }

  return (
    <section id="canli-ara" className="space-y-3 rounded-2xl border border-border bg-surface-card p-4 shadow-card">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-brand">GastroSkor Onerisi</h2>
          <p className="text-xs text-content-muted">
            Canli Google Places + akilli filtre. Ornek: &quot;Donerci 4.5 yildiz 200 mt&quot;
            {locationStatus === 'loading' ? ' Konum aliniyor...' : null}
            {locationStatus === 'denied'
              ? ' Konum izni yok: mesafe Bursa merkezine gore hesaplanir.'
              : null}
            {lastDistanceOrigin === 'user' ? ' Son arama: konumunuza gore.' : null}
            {lastDistanceOrigin === 'city_center' ? ' Son arama: Bursa merkezine gore.' : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-border px-2 py-0.5 text-xs text-content-muted">
            {city}
          </span>
          {isAuthenticated ? (
            <button type="button" onClick={() => signOut()} className="btn-secondary btn-sm">
              Cikis
            </button>
          ) : (
            <button
              type="button"
              onClick={async () => {
                try {
                  await signOut({ redirect: false });
                } catch {
                  /* ignore */
                }
                await signIn('google', { callbackUrl: '/' }, { prompt: 'consent' });
              }}
              className="btn-primary btn-sm">
              Google ile Giris
            </button>
          )}
        </div>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ornek: Donerci 4.5 yildiz 200 mt"
          className="input-field flex-1"
        />
        <button type="submit" disabled={loading} className="btn-primary shrink-0">
          {loading ? 'Araniyor...' : 'Canli Ara'}
        </button>
      </form>

      <div className="grid gap-2 sm:grid-cols-2">
        <select
          value={distanceBand}
          onChange={(e) => setDistanceBand(e.target.value as DistanceBand)}
          className="input-field text-sm">
          {DISTANCE_BAND_OPTIONS.map((option) => (
            <option key={option.value || 'all'} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={ratingBand}
          onChange={(e) => setRatingBand(e.target.value as RatingBand)}
          className="input-field text-sm">
          {RATING_BAND_OPTIONS.map((option) => (
            <option key={option.value || 'all'} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {parsedIntent && (parsedIntent.removed_tokens.length > 0 || parsedIntent.query !== parsedIntent.raw_query) ? (
        <p className="text-xs text-content-muted">
          Analiz: &quot;{parsedIntent.query}&quot;
          {parsedIntent.min_rating != null ? ` · min ${parsedIntent.min_rating} yildiz` : ''}
          {parsedIntent.max_distance_m != null ? ` · max ${parsedIntent.max_distance_m} m` : ''}
        </p>
      ) : null}

      {error ? <div className="rounded-xl border border-bad/40 bg-bad/10 p-3 text-sm text-red-200">{error}</div> : null}

      {items.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
          {items.map((item) => (
            <RestaurantCard
              key={item.place_id}
              restaurant={livePlaceToRestaurantCard(item)}
              compact
              distanceLabel={livePlaceDistanceLabel(item)}
              googleRating={item.rating}
              googleReviewCount={item.user_ratings_total}
              distanceMeters={item.distance_meters}
              mapsDirectionsUrl={item.maps_directions_url}
              href={item.restaurant_id ? `/restaurants/${item.restaurant_id}` : null}
              footer={
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    showDetails(item.place_id);
                  }}
                  className="rounded-lg bg-accent/20 px-2.5 py-1 text-[10px] font-medium text-accent hover:bg-accent/30">
                  Detaylari gor
                </button>
              }
            />
          ))}
        </div>
      ) : null}

      {activePlaceId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface/90 p-4 backdrop-blur-sm">
          <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-border/80 bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/70 bg-surface-input px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-content">Restoran Detayları</h3>
                <p className="mt-1 text-sm text-content-muted">Place ID: {activePlaceId}</p>
              </div>
              <button
                onClick={closeDetails}
                className="rounded-full bg-surface-input px-4 py-2 text-sm text-content transition hover:bg-surface-input">
                Kapat
              </button>
            </div>
            <div className="max-h-[80vh] overflow-y-auto px-6 py-5">
              {detailsLoading ? (
                <div className="rounded-2xl border border-border/70 bg-surface-input p-6 text-center text-content">Detaylar yükleniyor...</div>
              ) : detailsError ? (
                <div className="rounded-2xl border border-bad/40 bg-bad/10 p-6 text-sm text-red-200">{detailsError}</div>
              ) : details ? (
                <div className="space-y-6">
                  <RestaurantPhotoCarousel photos={details.photo_urls ?? []} className="rounded-none border-0 sm:rounded-2xl sm:border" />

                  <div className="rounded-3xl border border-border/70 bg-surface-input p-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h4 className="text-2xl font-semibold text-content">{details.name}</h4>
                        <p className="mt-2 text-sm text-content-muted">{details.address ?? 'Adres bilgisi yok'}</p>
                      </div>
                      <div className="space-y-1 text-right text-sm text-content-muted">
                        <p>Puan: {details.rating ?? '-'}</p>
                        <p>Yorum: {details.user_ratings_total ?? '-'}</p>
                        {details.phone_number ? <p>Tel: {details.phone_number}</p> : null}
                        {details.website ? (
                          <p>
                            <a
                              href={details.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-accent hover:underline">
                              Web sitesi
                            </a>
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-6 grid gap-3 md:grid-cols-2">
                      {details.opening_hours?.weekday_text ? (
                        <div className="rounded-2xl border border-border/50 bg-surface-input p-4">
                          <h5 className="text-sm font-semibold text-content">Çalışma Saatleri</h5>
                          <p className="mt-1 text-xs text-content-muted">{details.opening_hours.open_now ? 'Açık' : 'Kapalı'}</p>
                          <div className="mt-3 space-y-1 text-xs text-content-muted">
                            {details.opening_hours.weekday_text?.map((line) => (
                              <div key={line}>{line}</div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {details.analysis ? (
                        <div className="rounded-2xl border border-border/50 bg-surface-input p-4">
                          <h5 className="text-sm font-semibold text-content">AI Analiz</h5>
                          <p className="mt-1 text-xs text-content-muted">
                            Bu analiz hem Google yorumlarini hem de GastroSkor uyelerinin yorumlarini birleştirerek hazirlandi.
                          </p>
                          <p className="mt-3 text-xs text-content-muted">{details.analysis.summary}</p>
                          <div className="mt-4 grid gap-3">
                            {details.analysis.categories.map((category) => (
                              <div key={category.category} className="rounded-2xl border border-border/60 bg-surface/90 p-3">
                                <div className="flex items-center justify-between gap-4 text-sm font-semibold text-content">
                                  <span>{category.category}</span>
                                  <span>{(category.score ?? 0).toFixed(1)}</span>
                                </div>
                                <p className="mt-2 text-xs text-content-muted">{category.reason}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-border/70 bg-surface-input p-6">
                    <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-border/50 pb-4">
                      <button
                        type="button"
                        onClick={() => setActiveTab('google')}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                          activeTab === 'google'
                            ? 'bg-emerald-500 text-surface'
                            : 'bg-surface-input text-content-muted hover:bg-surface-input'
                        }`}
                      >
                        Google Yorumları
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('member')}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                          activeTab === 'member'
                            ? 'bg-emerald-500 text-surface'
                            : 'bg-surface-input text-content-muted hover:bg-surface-input'
                        }`}
                      >
                        GastroSkor Üye Yorumları
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('gastro')}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                          activeTab === 'gastro'
                            ? 'bg-amber-500 text-surface'
                            : 'bg-surface-input text-content-muted hover:bg-surface-input'
                        }`}
                      >
                        GastroSkor Puanı
                      </button>
                    </div>

                    {activeTab === 'gastro' ? (
                      <div className="space-y-4">
                        <h5 className="text-sm font-semibold text-brand-gold">GastroSkor Puanlama Matrisi</h5>
                        {selectedItem ? (
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl border border-border/60 bg-surface/90 p-4">
                              <p className="text-xs text-content-muted">Toplam GastroSkor</p>
                              <p className="mt-1 text-2xl font-bold text-brand-gold">{selectedItem.gastro_score.toFixed(1)}</p>
                            </div>
                            <div className="rounded-2xl border border-border/60 bg-surface/90 p-4">
                              <p className="text-xs text-content-muted">Mesafe puani</p>
                              <p className="mt-1 text-xl font-semibold text-content">{selectedItem.distance_score}</p>
                              <p className="mt-1 text-xs text-content-muted">
                                {selectedItem.distance_meters != null
                                  ? formatDistance(selectedItem.distance_meters)
                                  : '-'}{' '}
                                ({selectedItem.distance_origin === 'user' ? 'konumunuza gore' : 'Bursa merkezine gore'})
                              </p>
                            </div>
                            <div className="rounded-2xl border border-border/60 bg-surface/90 p-4">
                              <p className="text-xs text-content-muted">Lezzet (yildiz) puani</p>
                              <p className="mt-1 text-xl font-semibold text-content">{selectedItem.rating_score}</p>
                              <p className="mt-1 text-xs text-content-muted">Google: {selectedItem.rating ?? '-'}</p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-content-muted">Puan detayi bulunamadi.</p>
                        )}
                      </div>
                    ) : null}

                    {activeTab === 'google' ? (
                      <>
                        <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div>
                            <h5 className="text-sm font-semibold text-content">Google Yorumları</h5>
                            <p className="text-xs text-content-muted">Canli Google Places yorumlari buradan getiriliyor.</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <select
                              value={reviewSort}
                              onChange={(e) => onReviewFilterChange(e.target.value as ReviewSortOption, reviewFilter)}
                              disabled={detailsLoading}
                              className="rounded-lg border border-border bg-surface-input/70 px-3 py-1.5 text-xs text-content outline-none transition disabled:opacity-60"
                            >
                              <option value="newest">En Yeni</option>
                              <option value="oldest">En Eski</option>
                              <option value="highest_rating">En Yüksek Puan</option>
                              <option value="lowest_rating">En Düşük Puan</option>
                            </select>
                            <button
                              onClick={() => onReviewFilterChange(reviewSort, reviewFilter === 'negative' ? 'all' : 'negative')}
                              disabled={detailsLoading}
                              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${
                                reviewFilter === 'negative'
                                  ? 'bg-red-500/30 text-red-200 border border-red-500/50'
                                  : 'bg-surface-input/70 text-content border border-border'
                              }`}
                            >
                              Negatif Yorumlar
                            </button>
                          </div>
                        </div>
                        {details.reviews.length === 0 ? (
                          <p className="mt-3 text-sm text-content-muted">Yorum bulunamadi.</p>
                        ) : (
                          <div className="mt-4 space-y-4">
                            {details.reviews.map((review, index) => (
                              <div key={index} className="rounded-2xl border border-border/60 bg-surface/90 p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-content">{review.author_name ?? 'Anonim'}</p>
                                    <p className="mt-1 text-xs text-content-muted">{review.relative_time_description ?? ''}</p>
                                  </div>
                                  <span className="rounded-full bg-surface-input px-3 py-1 text-xs text-content">{review.rating ?? '-'}</span>
                                </div>
                                <p className="mt-3 text-sm leading-6 text-content-muted">{review.text ?? 'Yorum metni mevcut degil.'}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : null}

                    {activeTab === 'member' ? (
                      <>
                        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h5 className="text-sm font-semibold text-content">GastroSkor Üye Yorumları</h5>
                            <p className="text-xs text-content-muted">Üyelerimizin verdiği değerlendirmeler burada listeleniyor.</p>
                          </div>
                          <div className="text-right text-xs text-content-muted">
                            {details.member_review_count} yorum · Ortalama {details.member_avg_rating ?? '-'}
                          </div>
                        </div>
                        {profile ? (
                          <div className="mb-4 rounded-2xl border border-border/60 bg-surface/90 p-4 text-sm text-content">
                            <p className="font-semibold text-content">Girişli Üye: {profile.full_name ?? session?.user?.email}</p>
                            <p className="text-content-muted">GastroSkor Profil Puanı: {profile.gastro_score ?? 'Henüz puan yok'}</p>
                          </div>
                        ) : isAuthenticated ? (
                          <div className="mb-4 rounded-2xl border border-border/60 bg-surface/90 p-4 text-sm text-content">
                            Üye bilgileri senkronize ediliyor...
                          </div>
                        ) : (
                          <div className="mb-4 rounded-2xl border border-border/60 bg-surface/90 p-4 text-sm text-content">
                            GastroSkor üye yorumlarını eklemek için Google ile giriş yapın.
                          </div>
                        )}
                        <div className="space-y-4">
                          {gsReviewsLoading ? (
                            <p className="text-sm text-content-muted">Uye yorumlari yukleniyor...</p>
                          ) : gsReviews.length === 0 ? (
                            <p className="text-sm text-content-muted">Üye yorumu bulunmuyor.</p>
                          ) : (
                            <ReviewList
                              reviews={gsReviews}
                              viewerEmail={session?.user?.email ?? null}
                              viewerUserId={profile?.id ?? null}
                              onReviewChange={(updated) =>
                                setGsReviews((prev) =>
                                  prev.map((row) => (row.id === updated.id ? updated : row)),
                                )
                              }
                              onReviewDelete={(reviewId) =>
                                setGsReviews((prev) => prev.filter((row) => row.id !== reviewId))
                              }
                            />
                          )}
                        </div>
                        <form onSubmit={submitMemberReview} className="mt-6 space-y-4">
                          <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
                            <label className="text-sm font-medium text-content" htmlFor="member-rating">
                              Yıldız Puanı
                            </label>
                            <select
                              id="member-rating"
                              value={memberRating}
                              onChange={(e) => setMemberRating(Number(e.target.value))}
                              className="w-full rounded-xl border border-border bg-surface-input px-3 py-2 text-sm text-content outline-none"
                            >
                              {[5, 4, 3, 2, 1].map((value) => (
                                <option key={value} value={value}>
                                  {value} yıldız
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <textarea
                              value={memberReviewText}
                              onChange={(e) => setMemberReviewText(e.target.value)}
                              rows={4}
                              placeholder="GastroSkor yorumunuzu buraya yazın..."
                              className="w-full rounded-3xl border border-border bg-surface-input px-4 py-3 text-sm text-content outline-none focus:ring-2 focus:ring-accent/40"
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={memberLoading || !isAuthenticated || !details.restaurant_id}
                            className="btn-primary btn-sm disabled:opacity-50"
                          >
                            {memberLoading ? 'Gönderiliyor...' : 'GastroSkor Yorumunu Ekle'}
                          </button>
                          {!isAuthenticated && (
                            <p className="text-sm text-content-muted">Yorum eklemek için önce Google ile giriş yapın.</p>
                          )}
                          {details.restaurant_id === null && (
                            <p className="text-sm text-yellow-300">Bu restoran veritabanında kayıtlı değil; GastroSkor üye yorumu eklenemiyor.</p>
                          )}
                        </form>
                      </>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-border/70 bg-surface-input p-6 text-sm text-content">
                  Bir restoran secin ve detaylarini goruntuleyin.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
