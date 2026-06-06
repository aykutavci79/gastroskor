'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

import { ReviewList } from '@/components/ReviewList';
import { RestaurantPhotoCarousel } from '@/components/RestaurantPhotoCarousel';
import { StarRating } from '@/components/StarRating';
import { createReview, getLivePlaceDetails, listRestaurantReviews, syncUser } from '@/lib/api';
import type { AuthorNameDisplayMode } from '@/lib/display-name';
import { REVIEW_NAME_DISPLAY_STORAGE_KEY, previewAuthorName } from '@/lib/display-name';
import type {
  LivePlaceDetails,
  LivePlaceSearchItem,
  Review,
  ReviewFilterOption,
  ReviewSortOption,
  UserProfile,
} from '@/lib/types';

type Props = {
  placeId: string;
  selectedItem?: LivePlaceSearchItem | null;
};

function formatDistance(meters: number | null): string {
  if (meters == null) return '-';
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

export function LivePlaceDetailPanel({ placeId, selectedItem = null }: Props) {
  const [details, setDetails] = useState<LivePlaceDetails | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(true);
  const [reviewSort, setReviewSort] = useState<ReviewSortOption>('newest');
  const [reviewFilter, setReviewFilter] = useState<ReviewFilterOption>('all');
  const [activeTab, setActiveTab] = useState<'google' | 'member' | 'gastro'>('google');
  const [memberRating, setMemberRating] = useState(5);
  const [memberReviewText, setMemberReviewText] = useState('');
  const [memberNameDisplay, setMemberNameDisplay] = useState<AuthorNameDisplayMode>('full');
  const [memberLoading, setMemberLoading] = useState(false);
  const [gsReviews, setGsReviews] = useState<Review[]>([]);
  const [gsReviewsLoading, setGsReviewsLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';

  useEffect(() => {
    try {
      const stored = localStorage.getItem(REVIEW_NAME_DISPLAY_STORAGE_KEY);
      if (stored === 'masked' || stored === 'full' || stored === 'nickname') setMemberNameDisplay(stored);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (profile?.default_review_name_display) {
      setMemberNameDisplay(profile.default_review_name_display);
    }
  }, [profile?.default_review_name_display]);

  useEffect(() => {
    if (!isAuthenticated || !session?.user?.email) {
      setProfile(null);
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
    let cancelled = false;
    setDetails(null);
    setDetailsError(null);
    setDetailsLoading(true);
    setReviewSort('newest');
    setReviewFilter('all');
    setActiveTab(isAuthenticated ? 'member' : 'google');
    setMemberReviewText('');
    setMemberRating(5);

    getLivePlaceDetails(placeId, { sort: 'newest', filter: 'all' })
      .then((result) => {
        if (!cancelled) setDetails(result);
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Detaylar getirilirken hata olustu.';
        if (message.toLowerCase().includes('failed to fetch')) {
          setDetailsError(
            'Backend baglantisi kurulamadi. Canli API (NEXT_PUBLIC_API_URL) ayarini ve sunucuyu kontrol edin.',
          );
        } else {
          setDetailsError(message);
        }
      })
      .finally(() => {
        if (!cancelled) setDetailsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [placeId, isAuthenticated]);

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

  function onReviewFilterChange(sort: ReviewSortOption, filter: ReviewFilterOption) {
    setReviewSort(sort);
    setReviewFilter(filter);
    setDetailsLoading(true);

    getLivePlaceDetails(placeId, { sort, filter })
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
      setDetailsError('Yorum için sağ üstten Kullanıcı girişi (Google) yapın.');
      return;
    }

    setMemberLoading(true);
    setDetailsError(null);

    try {
      try {
        localStorage.setItem(REVIEW_NAME_DISPLAY_STORAGE_KEY, memberNameDisplay);
      } catch {
        /* ignore */
      }
      await createReview({
        restaurant_id: details.restaurant_id,
        rating: memberRating,
        review_text: memberReviewText,
        author_id: profile?.id ?? undefined,
        author_email: session.user.email,
        author_name: session.user.name ?? undefined,
        author_avatar_url: session.user.image ?? undefined,
        author_name_display: memberNameDisplay,
      });

      setMemberReviewText('');
      setMemberRating(5);

      const [refreshed, reviewRows] = await Promise.all([
        getLivePlaceDetails(placeId, {
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

  if (detailsLoading && !details) {
    return (
      <div className="rounded-2xl border border-border/70 bg-surface-input p-6 text-center text-content">
        Detaylar yükleniyor...
      </div>
    );
  }

  if (detailsError && !details) {
    return (
      <div className="rounded-2xl border border-bad/40 bg-bad/10 p-6 text-sm text-red-200">{detailsError}</div>
    );
  }

  if (!details) {
    return (
      <div className="rounded-2xl border border-border/70 bg-surface-input p-6 text-sm text-content">
        Restoran detayi bulunamadi.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {detailsError ? (
        <div className="rounded-2xl border border-bad/40 bg-bad/10 p-4 text-sm text-red-200">{detailsError}</div>
      ) : null}

      <RestaurantPhotoCarousel photos={details.photo_urls ?? []} className="rounded-2xl border border-border/70" />

      <div className="rounded-3xl border border-border/70 bg-surface-input p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-content">{details.name}</h1>
            <p className="mt-2 text-sm text-content-muted">{details.address ?? 'Adres bilgisi yok'}</p>
          </div>
          <div className="space-y-1 text-right text-sm text-content-muted">
            <p>Puan: {details.rating ?? '-'}</p>
            <p>Yorum: {details.user_ratings_total ?? '-'}</p>
            {details.phone_number ? (
              <p>
                Tel:{' '}
                <a href={`tel:${details.phone_number}`} className="text-accent hover:underline">
                  {details.phone_number}
                </a>
              </p>
            ) : null}
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
              <h2 className="text-sm font-semibold text-content">Çalışma Saatleri</h2>
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
              <h2 className="text-sm font-semibold text-content">AI Analiz</h2>
              <p className="mt-1 text-xs text-content-muted">
                GastroSkor kategori skorlari 10 uzerindendir (Google yildizi 5 uzerindendir).
                {details.rating != null ? <> Google ort.: {details.rating.toFixed(1)}/5.</> : null}
              </p>
              <p className="mt-3 text-xs text-content-muted">{details.analysis.summary}</p>
              {details.analysis.overall_score != null ? (
                <p className="mt-2 text-sm font-semibold text-accent">
                  Genel: {details.analysis.overall_score.toFixed(1)}/10
                </p>
              ) : null}
              <div className="mt-4 grid gap-3">
                {details.analysis.categories.map((category) => (
                  <div key={category.category} className="rounded-2xl border border-border/60 bg-surface/90 p-3">
                    <div className="flex items-center justify-between gap-4 text-sm font-semibold text-content">
                      <span>{category.category}</span>
                      <span>{(category.score ?? 0).toFixed(1)}/10</span>
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
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-accent/40 bg-accent/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-content">GastroSkor&apos;da yorum yap</p>
            <p className="mt-1 text-xs text-content-muted">
              Yildiz ver, deneyimini yaz — uye yorumlari sekmesinde.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('member')}
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-surface transition hover:opacity-90">
            Yorum yap
          </button>
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-border/50 pb-4">
          <button
            type="button"
            onClick={() => setActiveTab('google')}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeTab === 'google'
                ? 'bg-emerald-500 text-surface'
                : 'bg-surface-input text-content-muted hover:bg-surface-input'
            }`}>
            Google Yorumları
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('member')}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeTab === 'member'
                ? 'bg-emerald-500 text-surface'
                : 'bg-surface-input text-content-muted hover:bg-surface-input'
            }`}>
            GastroSkor Üye Yorumları
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('gastro')}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeTab === 'gastro'
                ? 'bg-amber-500 text-surface'
                : 'bg-surface-input text-content-muted hover:bg-surface-input'
            }`}>
            GastroSkor Puanı
          </button>
        </div>

        {activeTab === 'gastro' ? (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-brand-gold">GastroSkor Puanlama Matrisi</h2>
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
                    {selectedItem.distance_meters != null ? formatDistance(selectedItem.distance_meters) : '-'}{' '}
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
                <h2 className="text-sm font-semibold text-content">Google Yorumları</h2>
                <p className="text-xs text-content-muted">Canli Google Places yorumlari buradan getiriliyor.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  value={reviewSort}
                  onChange={(e) => onReviewFilterChange(e.target.value as ReviewSortOption, reviewFilter)}
                  disabled={detailsLoading}
                  className="rounded-lg border border-border bg-surface-input/70 px-3 py-1.5 text-xs text-content outline-none transition disabled:opacity-60">
                  <option value="newest">En Yeni</option>
                  <option value="oldest">En Eski</option>
                  <option value="highest_rating">En Yüksek Puan</option>
                  <option value="lowest_rating">En Düşük Puan</option>
                </select>
                <button
                  type="button"
                  onClick={() => onReviewFilterChange(reviewSort, reviewFilter === 'negative' ? 'all' : 'negative')}
                  disabled={detailsLoading}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${
                    reviewFilter === 'negative'
                      ? 'bg-red-500/30 text-red-200 border border-red-500/50'
                      : 'bg-surface-input/70 text-content border border-border'
                  }`}>
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
                      <span className="rounded-full bg-surface-input px-3 py-1 text-xs text-content">
                        {review.rating ?? '-'}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-content-muted">
                      {review.text ?? 'Yorum metni mevcut degil.'}
                    </p>
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
                <h2 className="text-sm font-semibold text-content">GastroSkor Üye Yorumları</h2>
                <p className="text-xs text-content-muted">Üyelerimizin verdiği değerlendirmeler burada listeleniyor.</p>
              </div>
              <div className="text-right text-xs text-content-muted">
                {details.member_review_count} yorum · Ortalama {details.member_avg_rating ?? '-'}
              </div>
            </div>
            <form
              onSubmit={submitMemberReview}
              className="mb-6 space-y-4 rounded-2xl border border-accent/30 bg-surface/90 p-4">
              <h3 className="text-sm font-semibold text-content">Yorum yap</h3>
              {!isAuthenticated ? (
                <p className="text-sm text-content-muted">Yorum eklemek icin sag ustten Google ile giris yapin.</p>
              ) : (
                <>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-content-muted">Yorumda adin nasil gorunsun?</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setMemberNameDisplay('full')}
                        className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold ${
                          memberNameDisplay === 'full'
                            ? 'border-accent bg-accent/15 text-accent'
                            : 'border-border bg-surface-input text-content-muted'
                        }`}>
                        Tam ad
                      </button>
                      <button
                        type="button"
                        onClick={() => setMemberNameDisplay('masked')}
                        className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold ${
                          memberNameDisplay === 'masked'
                            ? 'border-accent bg-accent/15 text-accent'
                            : 'border-border bg-surface-input text-content-muted'
                        }`}>
                        Gizli
                      </button>
                    </div>
                    <p className="text-xs text-content-muted">
                      Onizleme:{' '}
                      <span className="font-semibold text-content">
                        {previewAuthorName(session?.user?.name ?? null, memberNameDisplay, profile?.nickname)}
                      </span>
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-content">Yildiz puani</p>
                    <StarRating value={memberRating} onChange={setMemberRating} />
                  </div>
                  <textarea
                    value={memberReviewText}
                    onChange={(e) => setMemberReviewText(e.target.value)}
                    rows={4}
                    placeholder="GastroSkor yorumunuzu buraya yazin..."
                    className="w-full rounded-3xl border border-border bg-surface-input px-4 py-3 text-sm text-content outline-none focus:ring-2 focus:ring-accent/40"
                  />
                  <button
                    type="submit"
                    disabled={memberLoading || !details.restaurant_id}
                    className="btn-primary btn-sm disabled:opacity-50">
                    {memberLoading ? 'Gonderiliyor...' : 'GastroSkor Yorumunu Ekle'}
                  </button>
                  {!details.restaurant_id ? (
                    <p className="text-sm text-yellow-300">
                      Bu restoran veritabaninda kayitli degil; yorum eklenemiyor.
                    </p>
                  ) : null}
                </>
              )}
            </form>
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
                    setGsReviews((prev) => prev.map((row) => (row.id === updated.id ? updated : row)))
                  }
                  onReviewDelete={(reviewId) =>
                    setGsReviews((prev) => prev.filter((row) => row.id !== reviewId))
                  }
                />
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
