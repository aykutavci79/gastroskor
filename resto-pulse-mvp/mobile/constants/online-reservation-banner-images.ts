import type { ImageSourcePropType } from 'react-native';

/** Keşfet vitrin — online rezervasyon banner slaytları (WebP, ~60–160 KB). */
export const ONLINE_RESERVATION_BANNER_SLIDES: {
  key: string;
  label: string;
  source: ImageSourcePropType;
}[] = [
  {
    key: 'chandelier-fireplace',
    label: 'Şömineli salon',
    source: require('@/assets/online-reservation/online-reservation-01-chandelier-fireplace.webp'),
  },
  {
    key: 'candlelit-private',
    label: 'Mum ışığı',
    source: require('@/assets/online-reservation/online-reservation-02-candlelit-private.webp'),
  },
  {
    key: 'grand-hall',
    label: 'Avlu salon',
    source: require('@/assets/online-reservation/online-reservation-03-grand-hall.webp'),
  },
  {
    key: 'terrace-dusk',
    label: 'Teras akşam',
    source: require('@/assets/online-reservation/online-reservation-04-terrace-dusk.webp'),
  },
  {
    key: 'booth-fireplace',
    label: 'Lüks köşe',
    source: require('@/assets/online-reservation/online-reservation-05-booth-fireplace.webp'),
  },
];
