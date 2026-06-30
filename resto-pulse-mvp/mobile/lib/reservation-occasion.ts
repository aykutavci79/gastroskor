export const RESERVATION_OCCASION_TYPES = [
  'birthday',
  'anniversary',
  'business_dinner',
  'proposal',
  'celebration',
  'graduation',
  'baby_shower',
  'other',
] as const;

export type ReservationOccasionType = (typeof RESERVATION_OCCASION_TYPES)[number];

export const RESERVATION_OCCASION_LABELS: Record<ReservationOccasionType, string> = {
  birthday: 'Doğum günü',
  anniversary: 'Yıldönümü',
  business_dinner: 'İş yemeği',
  proposal: 'Evlilik teklifi',
  celebration: 'Kutlama',
  graduation: 'Mezuniyet',
  baby_shower: 'Baby shower',
  other: 'Diğer',
};

export function reservationOccasionLabel(value: ReservationOccasionType | null | undefined): string | null {
  if (!value) return null;
  return RESERVATION_OCCASION_LABELS[value] ?? null;
}

export const RESERVATION_OCCASION_OPTIONS = RESERVATION_OCCASION_TYPES.map((type) => ({
  type,
  label: RESERVATION_OCCASION_LABELS[type],
}));
