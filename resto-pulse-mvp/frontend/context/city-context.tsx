'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { resolveCityFromCoords, SUPPORTED_CITIES } from '@/lib/detect-city';

export type CityDetectStatus = 'loading' | 'ready' | 'denied';

type CitySource = 'manual' | 'geo';

const STORAGE_CITY = 'gastroskor_city';
const STORAGE_SOURCE = 'gastroskor_city_source';

type CityContextValue = {
  city: string;
  setCity: (city: string) => void;
  status: CityDetectStatus;
  coords: { lat: number; lng: number } | null;
  refreshFromLocation: () => void;
  useMyLocation: () => void;
};

const CityContext = createContext<CityContextValue | null>(null);

function isSupportedCity(value: string | null): value is (typeof SUPPORTED_CITIES)[number] {
  return Boolean(value && (SUPPORTED_CITIES as readonly string[]).includes(value));
}

function readStoredCity(): { city: string | null; source: CitySource | null } {
  if (typeof window === 'undefined') return { city: null, source: null };
  const city = localStorage.getItem(STORAGE_CITY);
  const source = localStorage.getItem(STORAGE_SOURCE);
  if (!isSupportedCity(city)) return { city: null, source: null };
  return { city, source: source === 'manual' || source === 'geo' ? source : null };
}

function persistCity(city: string, source: CitySource) {
  localStorage.setItem(STORAGE_CITY, city);
  localStorage.setItem(STORAGE_SOURCE, source);
}

export function CityProvider({ children, defaultCity = 'Bursa' }: { children: ReactNode; defaultCity?: string }) {
  const [city, setCityState] = useState(defaultCity);
  const [status, setStatus] = useState<CityDetectStatus>('loading');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const sourceRef = useRef<CitySource>('geo');
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    const stored = readStoredCity();
    if (stored.city) {
      setCityState(stored.city);
      sourceRef.current = stored.source ?? 'manual';
    }
    setStorageReady(true);
  }, []);

  const applyGeoResult = useCallback((latitude: number, longitude: number) => {
    setCoords({ lat: latitude, lng: longitude });
    const resolved = resolveCityFromCoords(latitude, longitude);
    if (sourceRef.current !== 'manual') {
      setCityState(resolved);
      persistCity(resolved, 'geo');
      sourceRef.current = 'geo';
    }
    setStatus('ready');
  }, []);

  const refreshFromLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('denied');
      return;
    }
    setStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => applyGeoResult(pos.coords.latitude, pos.coords.longitude),
      () => setStatus('denied'),
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 120_000 },
    );
  }, [applyGeoResult]);

  useEffect(() => {
    if (!storageReady) return;
    refreshFromLocation();
  }, [storageReady, refreshFromLocation]);

  const setCity = useCallback((next: string) => {
    if (!isSupportedCity(next)) return;
    sourceRef.current = 'manual';
    persistCity(next, 'manual');
    setCityState(next);
  }, []);

  const useMyLocation = useCallback(() => {
    sourceRef.current = 'geo';
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_SOURCE, 'geo');
    }
    refreshFromLocation();
  }, [refreshFromLocation]);

  return (
    <CityContext.Provider value={{ city, setCity, status, coords, refreshFromLocation, useMyLocation }}>
      {children}
    </CityContext.Provider>
  );
}

export function useDetectedCity(defaultCity = 'Bursa') {
  const ctx = useContext(CityContext);
  if (!ctx) {
    throw new Error('useDetectedCity CityProvider icinde kullanilmali.');
  }
  void defaultCity;
  return ctx;
}
