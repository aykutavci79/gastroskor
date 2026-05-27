export type DistanceBand = '' | '0-250' | '251-500' | '501-1000' | '1100-2000' | '2100+';
export type RatingBand = '' | '3.0-3.9' | '4.0-4.4' | '4.5-5.0';

export const DISTANCE_BAND_OPTIONS: { value: DistanceBand; label: string }[] = [
  { value: '', label: 'Mesafe: Tumu' },
  { value: '0-250', label: '0–250 m' },
  { value: '251-500', label: '251–500 m' },
  { value: '501-1000', label: '501 m – 1 km' },
  { value: '1100-2000', label: '1,1 – 2 km' },
  { value: '2100+', label: '2,1 km+' },
];

export const RATING_BAND_OPTIONS: { value: RatingBand; label: string }[] = [
  { value: '', label: 'Yildiz: Tumu' },
  { value: '3.0-3.9', label: '3,0 – 3,9' },
  { value: '4.0-4.4', label: '4,0 – 4,4' },
  { value: '4.5-5.0', label: '4,5 – 5,0' },
];
