import { cityDisplayLabel } from '@/constants/supported-cities';

export type CityAtmosphereLight = {
  background: string;
  text: string;
  accent: string;
};

export type CityAtmosphereDarkStrip = {
  background: string;
  text: string;
  muted: string;
  accent: string;
};

export type CityAtmosphere = {
  cityKey: string;
  label: string;
  hint: string;
  accent: string;
  light: CityAtmosphereLight;
  darkStrip: CityAtmosphereDarkStrip;
};

const CITY_ATMOSPHERE: Record<string, Omit<CityAtmosphere, 'cityKey' | 'label'>> = {
  Bursa: {
    hint: 'Yeşil Camii · Kapalı Çarşı · Uludağ',
    accent: '#52B788',
    light: { background: '#E8F5E9', text: '#2E7D32', accent: '#2E7D32' },
    darkStrip: {
      background: 'rgba(45, 106, 79, 0.28)',
      text: '#FFFFFF',
      muted: 'rgba(255,255,255,0.72)',
      accent: '#52B788',
    },
  },
  Istanbul: {
    hint: 'Boğaz · Galata · Tarihi yarımada',
    accent: '#A8DADC',
    light: { background: '#E3F2FD', text: '#1565C0', accent: '#1565C0' },
    darkStrip: {
      background: 'rgba(29, 53, 87, 0.38)',
      text: '#FFFFFF',
      muted: 'rgba(255,255,255,0.72)',
      accent: '#A8DADC',
    },
  },
  Ankara: {
    hint: 'Anıtkabir · Kocatepe · Hamamönü',
    accent: '#D4A373',
    light: { background: '#F5EDE8', text: '#6D4C41', accent: '#6D4C41' },
    darkStrip: {
      background: 'rgba(139, 90, 74, 0.3)',
      text: '#FFFFFF',
      muted: 'rgba(255,255,255,0.72)',
      accent: '#D4A373',
    },
  },
  Izmir: {
    hint: 'Kordon · Kemeraltı · Ege',
    accent: '#48CAE4',
    light: { background: '#E1F5FE', text: '#0277BD', accent: '#0277BD' },
    darkStrip: {
      background: 'rgba(0, 119, 182, 0.32)',
      text: '#FFFFFF',
      muted: 'rgba(255,255,255,0.72)',
      accent: '#48CAE4',
    },
  },
  Antalya: {
    hint: 'Kaleiçi · Düden · Akdeniz',
    accent: '#94D2BD',
    light: { background: '#E0F7FA', text: '#00695C', accent: '#00695C' },
    darkStrip: {
      background: 'rgba(10, 147, 150, 0.32)',
      text: '#FFFFFF',
      muted: 'rgba(255,255,255,0.72)',
      accent: '#94D2BD',
    },
  },
};

const FALLBACK = {
  hint: 'Keşfet · Puanla · Paylaş',
  accent: '#FFB703',
  light: { background: '#FFF8E1', text: '#E65100', accent: '#E65100' },
  darkStrip: {
    background: 'rgba(255, 107, 53, 0.16)',
    text: '#FFFFFF',
    muted: 'rgba(255,255,255,0.72)',
    accent: '#FFB703',
  },
};

export function getCityAtmosphere(city: string): CityAtmosphere {
  const theme = CITY_ATMOSPHERE[city] ?? FALLBACK;
  return {
    cityKey: city,
    label: cityDisplayLabel(city),
    ...theme,
  };
}
