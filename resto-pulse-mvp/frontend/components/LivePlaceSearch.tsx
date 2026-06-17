'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

import { RestaurantCard } from '@/components/RestaurantCard';
import { SocialProofScanBanner } from '@/components/SocialProofScanBanner';
import type { CityDetectStatus } from '@/hooks/useDetectedCity';
import { discoverSearch, getDiscoverJob, searchLivePlaces } from '@/lib/api';
import { getBackendAccessToken } from '@/lib/backend-auth-token';
import {
  pollDiscoverSocialJob,
  socialBadgeLabel,
  socialItemEligible,
  socialResultsByPlaceId,
} from '@/lib/discover-social';
import { livePlaceDetailHref, livePlaceDistanceLabel, livePlaceToRestaurantCard } from '@/lib/live-place-card';
import { DISTANCE_BAND_OPTIONS, RATING_BAND_OPTIONS, type DistanceBand, type RatingBand } from '@/lib/search-filters';
import { cityDisplayName } from '@/lib/detect-city';
import type { LivePlaceSearchItem, ParsedSearchIntent, SocialProofStatus } from '@/lib/types';

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

  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
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
  const [socialByPlace, setSocialByPlace] = useState<Map<string, { badge: string }>>(new Map());

  const backendTokenReady = Boolean(session?.backendAccessToken ?? getBackendAccessToken());
  const backendExchangeError = session?.backendExchangeError;
  const isLoggedIn = authStatus === 'authenticated';
  const canUseSocialProof = isLoggedIn && backendTokenReady;

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

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const query = q.trim();
    if (!query) {
      setItems([]);
      setError(null);
      setSocialStatus(null);
      setSocialByPlace(new Map());
      return;
    }

    const pollToken = pollTokenRef.current + 1;
    pollTokenRef.current = pollToken;

    setLoading(true);
    setError(null);
    setSocialStatus(null);
    setSocialByPlace(new Map());
    try {
      const coords = await requestUserCoords();

      if (canUseSocialProof) {
        const data = await discoverSearch({
          query,
          city,
          lat: coords?.lat,
          lng: coords?.lng,
        });
        setParsedIntent({
          raw_query: query,
          query,
          min_rating: null,
          max_distance_m: null,
          min_distance_m: null,
          removed_tokens: [],
        });
        setLastDistanceOrigin(data.places[0]?.distance_origin ?? (coords ? 'user' : 'city_center'));
        setItems(data.places);
        setSocialStatus(data.social);
        if (data.social.results?.length) {
          setSocialByPlace(socialResultsByPlaceId(data.social.results));
        }
        if (data.social.job_id && data.social.status === 'scanning') {
          void pollDiscoverSocialJob(
            data.social.job_id,
            (tick) => {
              if (pollTokenRef.current !== pollToken) return;
              setSocialStatus(tick);
              if (tick.results?.length) {
                setSocialByPlace(socialResultsByPlaceId(tick.results));
              }
            },
            async (jobId) => {
              const payload = await getDiscoverJob(jobId);
              return { social: payload.social, status: payload.status };
            },
          ).then((finalSocial) => {
            if (pollTokenRef.current !== pollToken) return;
            setSocialStatus(finalSocial);
            if (finalSocial.results?.length) {
              setSocialByPlace(socialResultsByPlaceId(finalSocial.results));
            }
          }).catch(() => {
            if (pollTokenRef.current !== pollToken) return;
            setSocialStatus((prev) => prev ? { ...prev, status: 'failed' } : { status: 'failed' });
          });
        }
      } else {
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
      }
      onSearchPerformed?.(query);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Canli arama sirasinda hata olustu.';
      setError(message);
      setItems([]);
      setSocialStatus(null);
      setSocialByPlace(new Map());
    } finally {
      setLoading(false);
    }
  }

  const cityLabel = cityDisplayName(city);
  const searchPlaceholder =
    cityStatus === 'ready'
      ? `Örn: İskender 4.5+ yıldız ${cityLabel}`
      : 'Örn: İskender 4.5+ yıldız';

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
                  ? `${cityLabel} · Google Haritalar ile anlık mekan araması`
                  : 'Konum kapalı — yöresel bölümden şehir seçebilirsin'
              : 'Canli Google Places + akilli filtre'}
            {canUseSocialProof ? ' · Sosyal sinyal taraması açık' : null}
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

      {isLoggedIn && !backendTokenReady ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
          Google ile giriş yapıldı ama <strong>API oturumu</strong> oluşmadı — sosyal tarama kapalı,
          sadece Google listesi gelir. Backend açıkken{' '}
          <Link href="/auth/giris" className="underline">
            çıkış yap → tekrar giriş
          </Link>{' '}
          (KVKK kutusu işaretli olsun).{' '}
          <code className="text-xs">NEXT_PUBLIC_API_URL</code> = <code className="text-xs">http://127.0.0.1:8000</code>
          {backendExchangeError ? (
            <span className="mt-2 block text-xs text-amber-200/90">
              Hata: {backendExchangeError}
            </span>
          ) : null}
        </div>
      ) : null}

      {authStatus === 'unauthenticated' ? (
        <p className="text-xs text-content-muted">
          Sosyal kanıt (Reddit, X, YouTube) için{' '}
          <Link href="/auth/giris" className="text-accent underline">
            giriş yap
          </Link>
          .
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={searchPlaceholder}
          className="input-field flex-1"
        />
        <button type="submit" disabled={loading} className="btn-primary shrink-0">
          {loading ? 'Araniyor...' : 'Ara'}
        </button>
      </form>

      <div className="grid gap-2 sm:grid-cols-2">
        <label htmlFor="live-search-distance" className="sr-only">
          Mesafe filtresi
        </label>
        <select
          id="live-search-distance"
          value={distanceBand}
          onChange={(e) => setDistanceBand(e.target.value as DistanceBand)}
          className="input-field text-sm"
          aria-label="Mesafe filtresi"
          disabled={canUseSocialProof}>
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
          aria-label="Yıldız filtresi"
          disabled={canUseSocialProof}>
          {RATING_BAND_OPTIONS.map((option) => (
            <option key={option.value || 'all'} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {canUseSocialProof ? (
        <p className="text-[10px] text-content-muted">Giriş yapılı aramada sosyal tarama önceliklidir; mesafe/yıldız filtreleri bu modda kapalı.</p>
      ) : null}

      {parsedIntent && (parsedIntent.removed_tokens.length > 0 || parsedIntent.query !== parsedIntent.raw_query) ? (
        <p className="text-xs text-content-muted">
          Analiz: &quot;{parsedIntent.query}&quot;
          {parsedIntent.min_rating != null ? ` · min ${parsedIntent.min_rating} yildiz` : ''}
          {parsedIntent.max_distance_m != null ? ` · max ${parsedIntent.max_distance_m} m` : ''}
        </p>
      ) : null}

      <SocialProofScanBanner social={socialStatus} />

      {error ? <div className="rounded-xl border border-bad/40 bg-bad/10 p-3 text-sm text-red-200">{error}</div> : null}

      {items.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
          {items.map((item) => {
            const socialRow = socialItemEligible(item) ? socialByPlace.get(item.place_id) : undefined;
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
                cornerBadge={socialBadgeLabel(socialRow?.badge)}
              />
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
