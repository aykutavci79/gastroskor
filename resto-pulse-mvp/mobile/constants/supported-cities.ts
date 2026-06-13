export const SUPPORTED_CITIES = ['Bursa', 'Istanbul', 'Ankara', 'Izmir'] as const;

export type SupportedCity = (typeof SUPPORTED_CITIES)[number];

export const CITY_LABELS: Record<SupportedCity, string> = {
  Bursa: 'Bursa',
  Istanbul: 'İstanbul',
  Ankara: 'Ankara',
  Izmir: 'İzmir',
};

export const DEFAULT_CITY: SupportedCity = 'Bursa';

export function cityDisplayLabel(city: string): string {
  const key = SUPPORTED_CITIES.find((c) => c.toLowerCase() === city.trim().toLowerCase());
  return key ? CITY_LABELS[key] : city.trim();
}

export function normalizeCityInput(city: string): SupportedCity {
  const folded = city.trim().toLowerCase().replace('ı', 'i').replace('İ', 'i');
  const match = SUPPORTED_CITIES.find((c) => c.toLowerCase() === folded || folded.startsWith(c.toLowerCase()));
  return match ?? DEFAULT_CITY;
}
