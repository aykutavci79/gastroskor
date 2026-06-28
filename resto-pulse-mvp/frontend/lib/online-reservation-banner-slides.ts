export const ONLINE_RESERVATION_BANNER_SLIDES = [
  { file: 'online-reservation-01-chandelier-fireplace.webp', label: 'Şömineli salon' },
  { file: 'online-reservation-02-candlelit-private.webp', label: 'Mum ışığı' },
  { file: 'online-reservation-03-grand-hall.webp', label: 'Avlu salon' },
  { file: 'online-reservation-04-terrace-dusk.webp', label: 'Teras akşam' },
  { file: 'online-reservation-05-booth-fireplace.webp', label: 'Lüks köşe' },
] as const;

export function onlineReservationBannerSrc(file: string): string {
  return `/images/online-reservation/${file}`;
}
