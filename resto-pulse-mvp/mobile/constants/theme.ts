import { StyleSheet } from 'react-native';

/**
 * GastroSkor tasarim tokenlari — frontend/app/globals.css ile birebir.
 * @see resto-pulse-mvp/frontend/app/globals.css
 */
export type GastroThemeMode = 'light' | 'dark';

export type GastroColorScheme = {
  readonly bg: string;
  readonly panel: string;
  readonly input: string;
  readonly border: string;
  readonly text: string;
  readonly muted: string;
  readonly placeholder: string;
  readonly accent: string;
  readonly accentHover: string;
  readonly gold: string;
  readonly success: string;
  readonly google: string;
  readonly bad: string;
  readonly amber: string;
  readonly rose: string;
  readonly sky: string;
  readonly accentDark: string;
  readonly overlayRipple: string;
  readonly featuredGlow: string;
  readonly accentSoft: string;
};

export const GastroColorsDark: GastroColorScheme = {
  bg: '#141414',
  panel: '#1E1E1E',
  input: '#2A2A2A',
  border: '#2E2E2E',
  text: '#FFFFFF',
  muted: '#A0A0A0',
  placeholder: '#666666',
  accent: '#FF6B35',
  accentHover: '#E55A25',
  gold: '#FFB703',
  success: '#4CAF79',
  google: '#4285F4',
  bad: '#EF4444',
  amber: '#FFB703',
  rose: '#EF4444',
  sky: '#4285F4',
  accentDark: '#FFFFFF',
  overlayRipple: 'rgba(255,255,255,0.08)',
  featuredGlow: 'rgba(255, 107, 53, 0.25)',
  accentSoft: 'rgba(255, 107, 53, 0.15)',
};

export const GastroColorsLight: GastroColorScheme = {
  bg: '#FAFAFA',
  panel: '#FFFFFF',
  input: '#F0F0F0',
  border: '#E0E0E0',
  text: '#141414',
  muted: '#5C5C5C',
  placeholder: '#8A8A8A',
  accent: '#FF6B35',
  accentHover: '#E55A25',
  gold: '#D97706',
  success: '#2E7D32',
  google: '#4285F4',
  bad: '#EF4444',
  amber: '#D97706',
  rose: '#EF4444',
  sky: '#4285F4',
  accentDark: '#141414',
  overlayRipple: 'rgba(0,0,0,0.06)',
  featuredGlow: 'rgba(255, 107, 53, 0.18)',
  accentSoft: 'rgba(255, 107, 53, 0.12)',
};

/** Geriye uyumluluk — koyu tokenlar */
export const GastroColors = GastroColorsDark;

export function gastroColorsFor(mode: GastroThemeMode): GastroColorScheme {
  return mode === 'light' ? GastroColorsLight : GastroColorsDark;
}

export type GastroShadowScheme = {
  readonly card: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
  readonly featured: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
};

export const GastroShadowDark: GastroShadowScheme = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  featured: {
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
};

export const GastroShadowLight: GastroShadowScheme = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  featured: {
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
};

/** Geriye uyumluluk */
export const GastroShadow = GastroShadowDark;

export function gastroShadowFor(mode: GastroThemeMode): GastroShadowScheme {
  return mode === 'light' ? GastroShadowLight : GastroShadowDark;
}

export const GastroStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GastroColors.border,
    backgroundColor: GastroColors.panel,
    padding: 14,
    ...GastroShadow.card,
  },
  cardFeatured: {
    borderWidth: 2,
    borderColor: GastroColors.accent,
    ...GastroShadow.featured,
  },
  input: {
    borderWidth: 1,
    borderColor: GastroColors.border,
    borderRadius: 12,
    backgroundColor: GastroColors.input,
    color: GastroColors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  inputSm: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 14,
  },
  btnPrimary: {
    backgroundColor: GastroColors.accent,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: GastroColors.text,
    fontWeight: '800',
  },
  btnOutline: {
    borderWidth: 1,
    borderColor: GastroColors.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnOutlineText: {
    color: GastroColors.text,
  },
  featuredBadge: {
    alignSelf: 'flex-start',
    backgroundColor: GastroColors.accent,
    color: GastroColors.text,
    fontWeight: '800',
    fontSize: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  pill: {
    backgroundColor: GastroColors.input,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  ratingBox: {
    backgroundColor: GastroColors.input,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  previewSurface: {
    backgroundColor: GastroColors.input,
    borderRadius: 10,
  },
  bodyText: {
    color: GastroColors.text,
    fontSize: 13,
  },
  mutedText: {
    color: GastroColors.muted,
    fontSize: 13,
  },
  goldText: {
    color: GastroColors.gold,
  },
  linkText: {
    color: GastroColors.google,
    fontWeight: '600',
  },
  errorText: {
    color: GastroColors.bad,
    fontSize: 13,
  },
});
