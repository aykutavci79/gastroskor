import type { DeviceCoords } from '@/lib/device-location';
import { DEFAULT_CITY, normalizeCityInput, type SupportedCity } from '@/constants/supported-cities';

/** Backend `CITY_SEARCH_BIAS` ile ayni merkezler. */
const CITY_CENTERS: Record<SupportedCity, DeviceCoords & { radiusM: number }> = {
  Bursa: { lat: 40.1885, lng: 29.061, radiusM: 50_000 },
  Istanbul: { lat: 41.0082, lng: 28.9784, radiusM: 80_000 },
  Ankara: { lat: 39.9334, lng: 32.8597, radiusM: 60_000 },
  Izmir: { lat: 38.4237, lng: 27.1428, radiusM: 60_000 },
};

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const r = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

export function resolveCityFromCoords(lat: number, lng: number): SupportedCity {
  let best: SupportedCity = DEFAULT_CITY;
  let bestDist = Infinity;
  for (const city of Object.keys(CITY_CENTERS) as SupportedCity[]) {
    const center = CITY_CENTERS[city];
    const d = haversineMeters(lat, lng, center.lat, center.lng);
    if (d < bestDist) {
      bestDist = d;
      best = city;
    }
  }
  return best;
}

export function cityCenterCoords(city: string): DeviceCoords {
  const normalized = normalizeCityInput(city);
  const center = CITY_CENTERS[normalized];
  return { lat: center.lat, lng: center.lng };
}
