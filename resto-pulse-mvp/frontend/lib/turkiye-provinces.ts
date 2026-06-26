import provinceGeo from '@/data/turkiye-province-geo.json';

export type ProvinceGeo = {
  name: string;
  lat: number;
  lng: number;
  radius_m: number;
};

export const TURKIYE_PROVINCES: readonly ProvinceGeo[] = provinceGeo.provinces;

export const SUPPORTED_CITIES = TURKIYE_PROVINCES.map((row) => row.name) as readonly string[];

export const DEFAULT_CITY = 'Bursa';

const CITY_ALIASES: Record<string, string> = {
  istanbul: 'İstanbul',
  izmir: 'İzmir',
  sanliurfa: 'Şanlıurfa',
  urfa: 'Şanlıurfa',
  afyon: 'Afyonkarahisar',
  mugla: 'Muğla',
  kirsehir: 'Kırşehir',
  kirklareli: 'Kırklareli',
  kirikkale: 'Kırıkkale',
  kahramanmaras: 'Kahramanmaraş',
  maras: 'Kahramanmaraş',
  gumushane: 'Gümüşhane',
  canakkale: 'Çanakkale',
  cankiri: 'Çankırı',
  corum: 'Çorum',
  duzce: 'Düzce',
  elazig: 'Elazığ',
  igdir: 'Iğdır',
  nigde: 'Niğde',
  usak: 'Uşak',
  sirnak: 'Şırnak',
  agri: 'Ağrı',
  diyarbakir: 'Diyarbakır',
  eskisehir: 'Eskişehir',
  tekirdag: 'Tekirdağ',
};

export function foldCityKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '');
}

const PROVINCE_BY_KEY = new Map<string, ProvinceGeo>(
  TURKIYE_PROVINCES.map((row) => [foldCityKey(row.name), row]),
);

for (const [alias, canonical] of Object.entries(CITY_ALIASES)) {
  const target = PROVINCE_BY_KEY.get(foldCityKey(canonical));
  if (target) PROVINCE_BY_KEY.set(alias, target);
}

export function resolveProvince(city: string): ProvinceGeo | null {
  return PROVINCE_BY_KEY.get(foldCityKey(city)) ?? null;
}

export function isKnownProvince(city: string): boolean {
  return resolveProvince(city) !== null;
}

export function normalizeCityInput(city: string): string {
  const folded = foldCityKey(city);
  const alias = CITY_ALIASES[folded];
  if (alias) return alias;
  const match = PROVINCE_BY_KEY.get(folded);
  return match?.name ?? DEFAULT_CITY;
}

export function cityDisplayName(city: string): string {
  return resolveProvince(city)?.name ?? city.trim();
}

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
  let best = DEFAULT_CITY;
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

/** Canlı arama başlığı — konum yokken şehir uydurmaz */
export function citySearchHeading(city: string, status: 'loading' | 'ready' | 'denied'): string {
  if (status !== 'ready') return 'Ne yesek?';
  const name = cityDisplayName(city);
  const suffix = name.endsWith('r') || name === 'İzmir' ? 'de' : 'da';
  return `${name}'${suffix} ne yesek?`;
}
