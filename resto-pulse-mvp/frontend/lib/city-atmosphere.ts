import { cityDisplayName } from '@/lib/detect-city';

export type CityAtmosphereLight = {
  background: string;
  text: string;
  accent: string;
};

export type CityAtmosphere = {
  cityKey: string;
  label: string;
  hint: string;
  /** Gece modu — gradient */
  gradient: string;
  accent: string;
  /** Gunduz modu — pastel duz renk */
  light: CityAtmosphereLight;
};

const CITY_ATMOSPHERE: Record<string, Omit<CityAtmosphere, 'cityKey' | 'label'>> = {
  Bursa: {
    hint: 'Yeşil Camii · Kapalı Çarşı · Uludağ',
    gradient:
      'linear-gradient(105deg, rgba(45,106,79,0.38) 0%, rgba(64,145,108,0.22) 42%, rgba(20,20,20,0.05) 100%)',
    accent: '#52b788',
    light: { background: '#e8f5e9', text: '#2e7d32', accent: '#2e7d32' },
  },
  Istanbul: {
    hint: 'Boğaz · Galata · Tarihi yarımada',
    gradient:
      'linear-gradient(105deg, rgba(29,53,87,0.45) 0%, rgba(69,123,157,0.24) 45%, rgba(20,20,20,0.05) 100%)',
    accent: '#a8dadc',
    light: { background: '#e3f2fd', text: '#1565c0', accent: '#1565c0' },
  },
  Ankara: {
    hint: 'Anıtkabir · Kocatepe · Hamamönü',
    gradient:
      'linear-gradient(105deg, rgba(139,90,74,0.34) 0%, rgba(166,124,82,0.2) 45%, rgba(20,20,20,0.05) 100%)',
    accent: '#d4a373',
    light: { background: '#f5ede8', text: '#6d4c41', accent: '#6d4c41' },
  },
  Izmir: {
    hint: 'Kordon · Kemeraltı · Ege',
    gradient:
      'linear-gradient(105deg, rgba(0,119,182,0.36) 0%, rgba(72,202,228,0.2) 45%, rgba(20,20,20,0.05) 100%)',
    accent: '#48cae4',
    light: { background: '#e1f5fe', text: '#0277bd', accent: '#0277bd' },
  },
  Antalya: {
    hint: 'Kaleiçi · Düden · Akdeniz',
    gradient:
      'linear-gradient(105deg, rgba(10,147,150,0.36) 0%, rgba(148,210,189,0.2) 45%, rgba(20,20,20,0.05) 100%)',
    accent: '#94d2bd',
    light: { background: '#e0f7fa', text: '#00695c', accent: '#00695c' },
  },
};

const FALLBACK = {
  hint: 'Keşfet · Puanla · Paylaş',
  gradient: 'linear-gradient(105deg, rgba(255,107,53,0.18) 0%, rgba(255,183,3,0.1) 50%, rgba(20,20,20,0.05) 100%)',
  accent: '#ffb703',
  light: { background: '#fff8e1', text: '#e65100', accent: '#e65100' },
};

export function getCityAtmosphere(city: string): CityAtmosphere {
  const theme = CITY_ATMOSPHERE[city] ?? FALLBACK;
  return {
    cityKey: city,
    label: cityDisplayName(city),
    ...theme,
  };
}
