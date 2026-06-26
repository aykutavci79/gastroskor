import provinceGeo from './turkiye-province-geo.json';

export type ProvinceGeo = {
  name: string;
  lat: number;
  lng: number;
  radius_m: number;
};

export const TURKIYE_PROVINCES: readonly ProvinceGeo[] = provinceGeo.provinces;

/** Resmi il adları — API ve vitrin ile uyumlu. */
export const SUPPORTED_CITIES = TURKIYE_PROVINCES.map((row) => row.name) as readonly string[];

export type SupportedCity = string;

export const DEFAULT_CITY: SupportedCity = 'Bursa';

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

function foldCityKey(value: string): string {
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
  const key = foldCityKey(city);
  return PROVINCE_BY_KEY.get(key) ?? null;
}

export function cityDisplayLabel(city: string): string {
  return resolveProvince(city)?.name ?? city.trim();
}

export function normalizeCityInput(city: string): SupportedCity {
  const folded = foldCityKey(city);
  const alias = CITY_ALIASES[folded];
  if (alias) return alias;
  const match = PROVINCE_BY_KEY.get(folded);
  return match?.name ?? DEFAULT_CITY;
}
