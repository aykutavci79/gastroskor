'use client';

import { FormEvent, useEffect, useState } from 'react';

import { RestaurantCard } from '@/components/RestaurantCard';
import type { CityDetectStatus } from '@/hooks/useDetectedCity';
import { searchLivePlaces } from '@/lib/api';
import { livePlaceDetailHref, livePlaceDistanceLabel, livePlaceToRestaurantCard } from '@/lib/live-place-card';
import { DISTANCE_BAND_OPTIONS, RATING_BAND_OPTIONS, type DistanceBand, type RatingBand } from '@/lib/search-filters';
import type { LivePlaceSearchItem, ParsedSearchIntent } from '@/lib/types';

type Props = {
  city?: string;
  cityStatus?: CityDetectStatus;
  userCoords?: { lat: number; lng: number } | null;
  /** Ana sayfada hero altinda — giris butonlari ust barda */
  embedded?: boolean;
  onSearchPerformed?: (query: string) => void;
};

export function LivePlaceSearch({
  city = 'Bursa',
  cityStatus = 'denied',
  userCoords: sharedCoords = null,
  embedded = false,
  onSearchPerformed,
}: Props) {
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
      onSearchPerformed?.(query);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Canli arama sirasinda hata olustu.';
      setError(message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      id="canli-ara"
      className={`space-y-3 rounded-2xl border border-border bg-surface-card p-4 shadow-card ${embedded ? '' : ''}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-content">
            {embedded ? 'Canlı arama' : 'Canlı arama'}
          </h2>
          <p className="text-xs text-content-muted">
            {embedded
              ? 'Google Haritalar ile anlık mekan araması'
              : 'Canli Google Places + akilli filtre'}
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

      <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Örn: Döner 4 yıldız Bursa"
          className="input-field flex-1"
        />
        <button type="submit" disabled={loading} className="btn-primary shrink-0">
          {loading ? 'Araniyor...' : 'Ara'}
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
              href={livePlaceDetailHref(item)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
