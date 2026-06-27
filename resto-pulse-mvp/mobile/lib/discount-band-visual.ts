export type DiscountBandKey = 'hot' | 'strong' | 'medium' | 'light';

export type DiscountBandVisual = {
  band: DiscountBandKey;
  label: string;
  background: string;
  border: string;
  text: string;
  stripe: string;
};

const LIGHT: DiscountBandVisual = {
  band: 'light',
  label: '%10–14',
  background: '#FEF3C7',
  border: '#FCD34D',
  text: '#92400E',
  stripe: '#FDE68A',
};

const MEDIUM: DiscountBandVisual = {
  band: 'medium',
  label: '%15–19',
  background: '#FDE047',
  border: '#FACC15',
  text: '#78350F',
  stripe: '#FCD34D',
};

const STRONG: DiscountBandVisual = {
  band: 'strong',
  label: '%20–24',
  background: '#FBBF24',
  border: '#F59E0B',
  text: '#451A03',
  stripe: '#FBBF24',
};

const HOT: DiscountBandVisual = {
  band: 'hot',
  label: '%25+',
  background: '#F59E0B',
  border: '#D97706',
  text: '#FFFFFF',
  stripe: '#EA580C',
};

/** Online menü indirimi — yalnizca %10+ rozet gosterilir. */
export function resolveDiscountBandVisual(
  percent: number | null | undefined,
): DiscountBandVisual | null {
  if (percent == null || Number.isNaN(percent) || percent < 10) {
    return null;
  }
  const value = Math.round(percent);
  if (value >= 25) return HOT;
  if (value >= 20) return STRONG;
  if (value >= 15) return MEDIUM;
  if (value >= 10) return LIGHT;
  return null;
}

export function formatDiscountBadgeLabel(percent: number): string {
  return `%${Math.round(percent)}`;
}

export function formatDiscountBadgeSubline(percent: number): string {
  return `tüm menüde`;
}
