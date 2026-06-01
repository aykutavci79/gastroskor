'use client';

import { useEffect, useState } from 'react';

import { resolveCityFromCoords } from '@/lib/detect-city';

export type CityDetectStatus = 'loading' | 'ready' | 'denied';

export function useDetectedCity(defaultCity = 'Bursa') {
  const [city, setCity] = useState(defaultCity);
  const [status, setStatus] = useState<CityDetectStatus>('loading');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus('denied');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        setCity(resolveCityFromCoords(latitude, longitude));
        setStatus('ready');
      },
      () => setStatus('denied'),
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 120_000 },
    );
  }, []);

  return { city, setCity, status, coords };
}
