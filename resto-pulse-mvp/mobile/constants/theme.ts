import { StyleSheet } from 'react-native';

/**
 * GastroSkor tasarim tokenlari — frontend/app/globals.css ile birebir.
 * @see resto-pulse-mvp/frontend/app/globals.css
 */
export const GastroColors = {
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
  /** @deprecated use gold */
  amber: '#FFB703',
  /** @deprecated use bad */
  rose: '#EF4444',
  /** @deprecated use google */
  sky: '#4285F4',
  /** Primary buton metni — web .btn-primary text-content */
  accentDark: '#FFFFFF',
  overlayRipple: 'rgba(255,255,255,0.08)',
  featuredGlow: 'rgba(255, 107, 53, 0.25)',
  accentSoft: 'rgba(255, 107, 53, 0.15)',
} as const;

export const GastroShadow = {
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
} as const;

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
