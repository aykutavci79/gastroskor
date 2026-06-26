import type { DeviceCoords } from '@/lib/device-location';
import { DEFAULT_CITY, normalizeCityInput, TURKIYE_PROVINCES, type SupportedCity } from '@/constants/supported-cities';

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
  for (const province of TURKIYE_PROVINCES) {
    const d = haversineMeters(lat, lng, province.lat, province.lng);
    if (d < bestDist) {
      bestDist = d;
      best = province.name;
    }
  }
  return best;
}

export function cityCenterCoords(city: string): DeviceCoords {
  const normalized = normalizeCityInput(city);
  const province = TURKIYE_PROVINCES.find((row) => row.name === normalized) ?? TURKIYE_PROVINCES[0];
  return { lat: province.lat, lng: province.lng };
}
