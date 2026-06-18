'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

import { RestaurantCard } from '@/components/RestaurantCard';
import { SocialProofScanBanner } from '@/components/SocialProofScanBanner';
import type { CityDetectStatus } from '@/hooks/useDetectedCity';
import { getDiscoverJob, getSocialOverlay, requestSocialScan, searchLivePlaces } from '@/lib/api';
import { getBackendAccessToken } from '@/lib/backend-auth-token';
import {
  lookupSocialResult,
  pollDiscoverSocialJob,
  socialBadgeLabel,
  socialItemEligible,
  socialResultsIndex,
  sortLivePlacesBySocialProof,
  type SocialResultsIndex,
} from '@/lib/discover-social';
import { livePlaceDetailHref, livePlaceDistanceLabel, livePlaceToRestaurantCard } from '@/lib/live-place-card';
import { DISTANCE_BAND_OPTIONS, RATING_BAND_OPTIONS, type DistanceBand, type RatingBand } from '@/lib/search-filters';
import { cityDisplayName } from '@/lib/detect-city';
import type { LivePlaceSearchItem, ParsedSearchIntent, SocialProofStatus } from '@/lib/types';

type SearchModel = 'gastroskor' | 'sosyal';

type Props = {
  city?: string;
  cityStatus?: CityDetectStatus;
  userCoords?: { lat: number; lng: number } | null;
  /** Ana sayfada hero altinda — giris butonlari ust barda */
  embedded?: boolean;
  /** Sayfa bazli benzersiz H2 (Screaming Frog duplicate onlemi) */
  heading?: string;
  onSearchPerformed?: (query: string) => void;
};

const EMPTY_SOCIAL_INDEX: SocialResultsIndex = { byPlaceId: new Map(), byName: new Map() };

export function LivePlaceSearch({
  city = 'Bursa',
  cityStatus = 'denied',
  userCoords: sharedCoords = null,
  embedded = false,
  heading,
  onSearchPerformed,
}: Props) {
  const { status: authStatus, data: session } = useSession();
  const pollTokenRef = useRef(0);
  const lastQueryRef = useRef('');

  const [q, setQ] = useState('');
  const [searchModel, setSearchModel] = useState<SearchModel>('gastroskor');
  const [loading, setLoading] = useState(false);
  const [socialScanLoading, setSocialScanLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<LivePlaceSearchItem[]>([]);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(sharedCoords);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'ready' | 'denied'>(
    cityStatus === 'loading' ? 'loading' : sharedCoords ? 'ready' : cityStatus === 'denied' ? 'denied' : 'idle',
  );
  const [lastDistanceOrigin, setLastDistanceOrigin] = useState<'user' | 'city_center' | null>(null);
  const [distanceBand, setDistanceBand] = useState<DistanceBand>('');
  const [ratingBand, setRatingBand] = useState<RatingBand>('');
  const [parsedIntent, setParsedIntent] = useState<ParsedSearchIntent | null>(null);
  const [socialStatus, setSocialStatus] = useState<SocialProofStatus | null>(null);
  const [socialIndex, setSocialIndex] = useState<SocialResultsIndex>(EMPTY_SOCIAL_INDEX);
  const [socialSortActive, setSocialSortActive] = useState(false);

  const backendTokenReady = Boolean(session?.backendAccessToken ?? getBackendAccessToken());
  const backendExchangeError = session?.backendExchangeError;
  const isLoggedIn = authStatus === 'authenticated';
  const canRunSocialMode = isLoggedIn && backendTokenReady;
  const isSocialMode = searchModel === 'sosyal';

  useEffect(() => {
    setUserCoords(sharedCoords);
    if (cityStatus === 'loading') setLocationStatus('loading');
    else if (sharedCoords) setLocationStatus('ready');
    else if (cityStatus === 'denied') setLocationStatus('denied');
  }, [sharedCoords, cityStatus]);

  function requestUserCoords(): Promise<{ lat: number; lng: number } | null> {
    if (sharedCoords) {
      setUserCoords(sharedCoords);
      setLocationStatus('ready');
      return Promise.resolve(sharedCoords);
    }
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

  const applySocialToList = useCallback((baseItems: LivePlaceSearchItem[], index: SocialResultsIndex) => {
    if (!baseItems.length) return baseItems;
    return sortLivePlacesBySocialProof(baseItems, index);
  }, []);

  const pollSocialJob = useCallback(
    (jobId: string, pollToken: number, baseItems: LivePlaceSearchItem[]) => {
      void pollDiscoverSocialJob(
        jobId,
        (tick) => {
          if (pollTokenRef.current !== pollToken) return;
          setSocialStatus(tick);
          if (tick.results?.length) {
            const index = socialResultsIndex(tick.results);
            setSocialIndex(index);
            setItems(applySocialToList(baseItems, index));
            setSocialSortActive(true);
          }
        },
        async (id) => {
          const payload = await getDiscoverJob(id);
          return { social: payload.social, status: payload.status };
        },
      )
        .then((finalSocial) => {
          if (pollTokenRef.current !== pollToken) return;
          setSocialStatus(finalSocial);
          if (finalSocial.results?.length) {
            const index = socialResultsIndex(finalSocial.results);
            setSocialIndex(index);
            setItems(applySocialToList(baseItems, index));
            setSocialSortActive(true);
          }
        })
        .catch(() => {
          if (pollTokenRef.current !== pollToken) return;
          setSocialStatus((prev) => (prev ? { ...prev, status: 'failed' } : { status: 'failed' }));
        });
    },
    [applySocialToList],
  );

  const runSocialLayer = useCallback(
    async (query: string, pollToken: number, baseItems: LivePlaceSearchItem[]) => {
      if (!canRunSocialMode) return;

      let overlay: SocialProofStatus | null = null;
      try {
        overlay = await getSocialOverlay({ query, city });
      } catch {
        overlay = null;
      }
      if (pollTokenRef.current !== pollToken) return;

      if (overlay?.status === 'ready' && overlay.results?.length) {
        const index = socialResultsIndex(overlay.results);
        setSocialStatus(overlay);
        setSocialIndex(index);
        setItems(applySocialToList(baseItems, index));
        setSocialSortActive(true);
        return;
      }

      if (overlay) setSocialStatus(overlay);

      const needsScan =
        !overlay ||
        overlay.status === 'uncached' ||
        (overlay.status === 'insufficient_data' && overlay.can_scan);

      if (!needsScan) return;

      setSocialScanLoading(true);
      try {
        const scanned = await requestSocialScan({ query, city });
        if (pollTokenRef.current !== pollToken) return;
        setSocialStatus(scanned);
        if (scanned.results?.length) {
          const index = socialResultsIndex(scanned.results);
          setSocialIndex(index);
          setItems(applySocialToList(baseItems, index));
          setSocialSortActive(true);
        }
        if (scanned.job_id && (scanned.status === 'scanning' || scanned.status === 'pending')) {
          pollSocialJob(scanned.job_id, pollToken, baseItems);
        }
      } catch (err) {
        if (pollTokenRef.current !== pollToken) return;
        const message = err instanceof Error ? err.message : 'Sosyal tarama baslatilamadi.';
        setError(message);
        setSocialStatus((prev) => (prev ? { ...prev, status: 'failed' } : { status: 'failed' }));
      } finally {
        setSocialScanLoading(false);
      }
    },
    [applySocialToList, canRunSocialMode, city, pollSocialJob],
  );

  const handleRequestSocialScan = useCallback(async () => {
    const query = lastQueryRef.current.trim();
    if (!query || socialScanLoading || !canRunSocialMode) return;
    const pollToken = pollTokenRef.current;
    setSocialScanLoading(true);
    setSocialSortActive(true);
    setError(null);
    try {
      const scanned = await requestSocialScan({ query, city });
      if (pollTokenRef.current !== pollToken) return;
      setSocialStatus(scanned);
      if (scanned.results?.length) {
        const index = socialResultsIndex(scanned.results);
        setSocialIndex(index);
        setItems((prev) => applySocialToList(prev, index));
      }
      if (scanned.job_id && (scanned.status === 'scanning' || scanned.status === 'pending')) {
        setItems((current) => {
          pollSocialJob(scanned.job_id!, pollToken, current);
          return current;
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sosyal tarama baslatilamadi.';
      setError(message);
    } finally {
      setSocialScanLoading(false);
    }
  }, [applySocialToList, canRunSocialMode, city, pollSocialJob, socialScanLoading]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const query = q.trim();
    if (!query) {
      setItems([]);
      setError(null);
      setSocialStatus(null);
      setSocialIndex(EMPTY_SOCIAL_INDEX);
      setSocialSortActive(false);
      lastQueryRef.current = '';
      return;
    }

    if (isSocialMode && !canRunSocialMode) {
      setError('Sosyal kanıt modu için giriş yap ve API oturumunun açık olduğundan emin ol.');
      return;
    }

    const pollToken = pollTokenRef.current + 1;
    pollTokenRef.current = pollToken;
    lastQueryRef.current = query;

    setLoading(true);
    setError(null);
    setSocialStatus(null);
    setSocialIndex(EMPTY_SOCIAL_INDEX);
    setSocialSortActive(false);

    try {
      const coords = await requestUserCoords();

      const result = await searchLivePlaces({
        q: query,
        city,
        limit: isSocialMode ? 20 : 8,
        origin_lat: coords?.lat,
        origin_lng: coords?.lng,
        distance_band: isSocialMode ? undefined : distanceBand || undefined,
        rating_band: isSocialMode ? undefined : ratingBand || undefined,
      });

      if (pollTokenRef.current !== pollToken) return;

      setParsedIntent(result.parsed);
      setLastDistanceOrigin(result.items[0]?.distance_origin ?? (coords ? 'user' : 'city_center'));
      setItems(result.items);

      if (isSocialMode) {
        await runSocialLayer(query, pollToken, result.items);
      }

      onSearchPerformed?.(query);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Canli arama sirasinda hata olustu.';
      setError(message);
      setItems([]);
      setSocialStatus(null);
      setSocialIndex(EMPTY_SOCIAL_INDEX);
      setSocialSortActive(false);
    } finally {
      setLoading(false);
    }
  }

  const cityLabel = cityDisplayName(city);
  const searchPlaceholder =
    cityStatus === 'ready'
      ? isSocialMode
        ? `Örn: en iyi iskender ${cityLabel}`
        : `Örn: İskender 4.5+ yıldız ${cityLabel}`
      : isSocialMode
        ? 'Örn: en iyi iskender'
        : 'Örn: İskender 4.5+ yıldız';

  const modelDescription =
    searchModel === 'gastroskor'
      ? 'Google + yüksek puan/yorum + mesafe + yerel favoriler'
      : 'Reddit, X, YouTube — Wilson skoru (giriş gerekir)';

  return (
    <section
      id="canli-ara"
      className={`space-y-3 rounded-2xl border border-border bg-surface-card p-4 shadow-card ${embedded ? '' : ''}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-content">
            {heading ?? `${city} — canlı restoran arama`}
          </h2>
          <p className="text-xs text-content-muted">
            {embedded
              ? cityStatus === 'loading'
                ? 'Konumun alınıyor — şehir buna göre ayarlanacak'
                : cityStatus === 'ready'
                  ? `${cityLabel} · ${modelDescription}`
                  : 'Konum kapalı — yöresel bölümden şehir seçebilirsin'
              : modelDescription}
            {locationStatus === 'loading' ? ' · Konum aliniyor…' : null}
            {locationStatus === 'denied' && !embedded
              ? ' Konum izni yok: mesafe sehir merkezine gore.'
              : null}
            {lastDistanceOrigin === 'user' ? ' · Konumunuza gore mesafe.' : null}
            {lastDistanceOrigin === 'city_center' ? ` · ${city} merkezine gore.` : null}
          </p>
        </div>
        {!embedded ? (
          <span className="rounded-full border border-border px-2 py-0.5 text-xs text-content-muted">
            {city}
          </span>
        ) : null}
      </div>

      <fieldset className="space-y-2">
        <legend className="text-xs font-medium text-content">Arama modeli</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label
            className={`cursor-pointer rounded-xl border p-3 text-sm transition ${
              searchModel === 'gastroskor'
                ? 'border-accent bg-accent/10 text-content'
                : 'border-border bg-surface-muted/30 text-content-muted hover:border-accent/40'
            }`}>
            <input
              type="radio"
              name="search-model"
              value="gastroskor"
              checked={searchModel === 'gastroskor'}
              onChange={() => setSearchModel('gastroskor')}
              className="sr-only"
            />
            <span className="font-semibold text-content">GastroSkor</span>
            <span className="mt-1 block text-xs text-content-muted">
              Varsayılan liste — Google skoru, mesafe ve yorum kalitesi
            </span>
          </label>
          <label
            className={`cursor-pointer rounded-xl border p-3 text-sm transition ${
              searchModel === 'sosyal'
                ? 'border-accent bg-accent/10 text-content'
                : 'border-border bg-surface-muted/30 text-content-muted hover:border-accent/40'
            } ${!canRunSocialMode ? 'opacity-90' : ''}`}>
            <input
              type="radio"
              name="search-model"
              value="sosyal"
              checked={searchModel === 'sosyal'}
              onChange={() => setSearchModel('sosyal')}
              className="sr-only"
            />
            <span className="font-semibold text-content">Sosyal kanıt</span>
            <span className="mt-1 block text-xs text-content-muted">
              Reddit / X / YouTube sinyali — farklı sıralama, giriş gerekir
            </span>
          </label>
        </div>
      </fieldset>

      {isSocialMode && !canRunSocialMode ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
          {isLoggedIn && !backendTokenReady ? (
            <>
              Google ile giriş yapıldı ama <strong>API oturumu</strong> oluşmadı.{' '}
              <Link href="/auth/giris" className="underline">
                Çıkış yap → tekrar giriş
              </Link>{' '}
              (KVKK kutusu işaretli olsun).
              {backendExchangeError ? (
                <span className="mt-2 block text-xs text-amber-200/90">Hata: {backendExchangeError}</span>
              ) : null}
            </>
          ) : (
            <>
              Sosyal kanıt modu için{' '}
              <Link href="/auth/giris" className="underline">
                giriş yap
              </Link>
              .
            </>
          )}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={searchPlaceholder}
          className="input-field flex-1"
        />
        <button
          type="submit"
          disabled={loading || (isSocialMode && !canRunSocialMode)}
          className="btn-primary shrink-0 disabled:opacity-60">
          {loading ? 'Aranıyor...' : 'Ara'}
        </button>
      </form>

      {!isSocialMode ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <label htmlFor="live-search-distance" className="sr-only">
            Mesafe filtresi
          </label>
          <select
            id="live-search-distance"
            value={distanceBand}
            onChange={(e) => setDistanceBand(e.target.value as DistanceBand)}
            className="input-field text-sm"
            aria-label="Mesafe filtresi">
            {DISTANCE_BAND_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <label htmlFor="live-search-rating" className="sr-only">
            Yıldız filtresi
          </label>
          <select
            id="live-search-rating"
            value={ratingBand}
            onChange={(e) => setRatingBand(e.target.value as RatingBand)}
            className="input-field text-sm"
            aria-label="Yıldız filtresi">
            {RATING_BAND_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <p className="text-[10px] text-content-muted">
          Sosyal kanıt modunda mesafe/yıldız filtreleri kapalı — sıralama sosyal sinyale göre yapılır.
        </p>
      )}

      {parsedIntent && (parsedIntent.removed_tokens.length > 0 || parsedIntent.query !== parsedIntent.raw_query) ? (
        <p className="text-xs text-content-muted">
          Analiz: &quot;{parsedIntent.query}&quot;
          {parsedIntent.min_rating != null ? ` · min ${parsedIntent.min_rating} yildiz` : ''}
          {parsedIntent.max_distance_m != null ? ` · max ${parsedIntent.max_distance_m} m` : ''}
        </p>
      ) : null}

      {isSocialMode ? (
        <SocialProofScanBanner
          social={socialStatus}
          loggedIn={canRunSocialMode}
          socialSortActive={socialSortActive}
          scanLoading={socialScanLoading}
          onRequestScan={handleRequestSocialScan}
          autoScan={loading || socialScanLoading}
        />
      ) : null}

      {error ? <div className="rounded-xl border border-bad/40 bg-bad/10 p-3 text-sm text-red-200">{error}</div> : null}

      {items.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
          {items.map((item) => {
            const socialRow =
              isSocialMode && socialItemEligible(item)
                ? lookupSocialResult(socialIndex, item)
                : undefined;
            return (
              <RestaurantCard
                key={item.place_id}
                restaurant={livePlaceToRestaurantCard(item)}
                compact
                distanceLabel={livePlaceDistanceLabel(item)}
                googleRating={item.rating}
                googleReviewCount={item.user_ratings_total}
                distanceMeters={item.distance_meters}
                mapsDirectionsUrl={item.maps_directions_url}
                href={livePlaceDetailHref(item)}
                cornerBadge={isSocialMode ? socialBadgeLabel(socialRow?.badge) : null}
              />
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
