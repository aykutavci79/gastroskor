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

/** i18next keys under `rezervasyon.*` */
export const RESERVATION_OCCASION_I18N_KEYS: Record<ReservationOccasionType, string> = {
  birthday: 'rezervasyon.occasionBirthday',
  anniversary: 'rezervasyon.occasionAnniversary',
  business_dinner: 'rezervasyon.occasionBusiness',
  proposal: 'rezervasyon.occasionProposal',
  celebration: 'rezervasyon.occasionCelebration',
  graduation: 'rezervasyon.occasionGraduation',
  baby_shower: 'rezervasyon.occasionBabyShower',
  other: 'rezervasyon.occasionOther',
};

export function reservationOccasionI18nKey(
  value: ReservationOccasionType | string | null | undefined,
): string | null {
  if (!value) return null;
  return RESERVATION_OCCASION_I18N_KEYS[value as ReservationOccasionType] ?? null;
}

export const RESERVATION_OCCASION_OPTIONS = RESERVATION_OCCASION_TYPES.map((type) => ({
  type,
  i18nKey: RESERVATION_OCCASION_I18N_KEYS[type],
}));
