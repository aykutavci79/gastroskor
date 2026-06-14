/** Backend city_resolver ile ayni sehir merkezleri (yaklasik). */
const CITY_CENTERS: Record<string, { lat: number; lng: number }> = {
  bursa: { lat: 40.1885, lng: 29.061 },
  istanbul: { lat: 41.0082, lng: 28.9784 },
  ankara: { lat: 39.9334, lng: 32.8597 },
  izmir: { lat: 38.4237, lng: 27.1428 },
  antalya: { lat: 36.8969, lng: 30.7133 },
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

export function resolveCityFromCoords(lat: number, lng: number): string {
  let best = 'Bursa';
  let bestDist = Infinity;
  for (const [key, center] of Object.entries(CITY_CENTERS)) {
    const d = haversineMeters(lat, lng, center.lat, center.lng);
    if (d < bestDist) {
      bestDist = d;
      best = key.charAt(0).toUpperCase() + key.slice(1);
    }
  }
  return best;
}

export const SUPPORTED_CITIES = ['Bursa', 'Istanbul', 'Ankara', 'Izmir', 'Antalya'] as const;

const CITY_LABELS: Record<string, string> = {
  Bursa: 'Bursa',
  Istanbul: 'İstanbul',
  Ankara: 'Ankara',
  Izmir: 'İzmir',
  Antalya: 'Antalya',
};

/** API slug → Türkçe görünen ad */
export function cityDisplayName(city: string): string {
  return CITY_LABELS[city] ?? city;
}

/** Canlı arama başlığı — konum yokken şehir uydurmaz */
export function citySearchHeading(
  city: string,
  status: 'loading' | 'ready' | 'denied',
): string {
  if (status !== 'ready') return 'Ne yesek?';
  const name = cityDisplayName(city);
  const suffix = city === 'Izmir' ? 'de' : 'da';
  return `${name}'${suffix} ne yesek?`;
}
