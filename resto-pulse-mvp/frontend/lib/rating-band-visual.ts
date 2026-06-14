export type RatingBandKey = 'elite' | 'good' | 'fair' | 'low';

export type RatingBandVisual = {
  band: RatingBandKey;
  stripe: string;
  accent: string;
  softBackground: string;
};

const GOLD_STRIPE = '#EAB308';
const GOLD_TEXT = '#FDE68A';
const SUCCESS = '#4CAF79';
const SLATE = '#64748B';
const SLATE_MUTED = '#475569';

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Google / yildiz puani (1-5) icin sol serit ve rozet renkleri. */
export function resolveRatingBandVisual(rating: number | null | undefined): RatingBandVisual | null {
  if (rating == null || Number.isNaN(rating)) {
    return null;
  }

  if (rating >= 4.5) {
    return {
      band: 'elite',
      stripe: GOLD_STRIPE,
      accent: GOLD_TEXT,
      softBackground: hexToRgba(GOLD_STRIPE, 0.22),
    };
  }
  if (rating >= 4.0) {
    return {
      band: 'good',
      stripe: SUCCESS,
      accent: SUCCESS,
      softBackground: hexToRgba(SUCCESS, 0.16),
    };
  }
  if (rating >= 3.5) {
    return {
      band: 'fair',
      stripe: SLATE,
      accent: '#94A3B8',
      softBackground: hexToRgba(SLATE, 0.2),
    };
  }

  return {
    band: 'low',
    stripe: SLATE_MUTED,
    accent: SLATE,
    softBackground: hexToRgba(SLATE_MUTED, 0.22),
  };
}

/** Sol serit: once Google, yoksa GS (kartta ayri gosterilir). */
export function resolveCardRatingScore(input: {
  gastroRating?: number | null;
  googleRating?: number | null;
}): number | null {
  if (input.googleRating != null && !Number.isNaN(input.googleRating)) {
    return input.googleRating;
  }
  if (input.gastroRating != null && !Number.isNaN(input.gastroRating)) {
    return input.gastroRating;
  }
  return null;
}
