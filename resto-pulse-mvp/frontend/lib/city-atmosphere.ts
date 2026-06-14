import { cityDisplayName } from '@/lib/detect-city';

export type CityAtmosphere = {
  cityKey: string;
  label: string;
  hint: string;
  /** linear-gradient stop colors (rgba) */
  gradient: string;
  accent: string;
};

const CITY_ATMOSPHERE: Record<string, Omit<CityAtmosphere, 'cityKey' | 'label'>> = {
  Bursa: {
    hint: 'Yeşil Camii · Kapalı Çarşı · Uludağ',
    gradient:
      'linear-gradient(105deg, rgba(45,106,79,0.38) 0%, rgba(64,145,108,0.22) 42%, rgba(20,20,20,0.05) 100%)',
    accent: '#52b788',
  },
  Istanbul: {
    hint: 'Boğaz · Galata · Tarihi yarımada',
    gradient:
      'linear-gradient(105deg, rgba(29,53,87,0.45) 0%, rgba(69,123,157,0.24) 45%, rgba(20,20,20,0.05) 100%)',
    accent: '#a8dadc',
  },
  Ankara: {
    hint: 'Anıtkabir · Kocatepe · Hamamönü',
    gradient:
      'linear-gradient(105deg, rgba(139,90,74,0.34) 0%, rgba(166,124,82,0.2) 45%, rgba(20,20,20,0.05) 100%)',
    accent: '#d4a373',
  },
  Izmir: {
    hint: 'Kordon · Kemeraltı · Ege',
    gradient:
      'linear-gradient(105deg, rgba(0,119,182,0.36) 0%, rgba(72,202,228,0.2) 45%, rgba(20,20,20,0.05) 100%)',
    accent: '#48cae4',
  },
  Antalya: {
    hint: 'Kaleiçi · Düden · Akdeniz',
    gradient:
      'linear-gradient(105deg, rgba(10,147,150,0.36) 0%, rgba(148,210,189,0.2) 45%, rgba(20,20,20,0.05) 100%)',
    accent: '#94d2bd',
  },
};

const FALLBACK = {
  hint: 'Keşfet · Puanla · Paylaş',
  gradient: 'linear-gradient(105deg, rgba(255,107,53,0.18) 0%, rgba(255,183,3,0.1) 50%, rgba(20,20,20,0.05) 100%)',
  accent: '#ffb703',
};

export function getCityAtmosphere(city: string): CityAtmosphere {
  const theme = CITY_ATMOSPHERE[city] ?? FALLBACK;
  return {
    cityKey: city,
    label: cityDisplayName(city),
    ...theme,
  };
}
