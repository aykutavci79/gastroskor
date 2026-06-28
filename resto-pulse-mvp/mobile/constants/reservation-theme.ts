/** Özel gece / rezervasyon — sıcak burgundy + Gastro gold (heyecan, mum ışığı). */
export const ReservationTheme = {
  bg: '#14080f',
  bgElevated: 'rgba(45, 18, 28, 0.94)',
  panel: 'rgba(26, 10, 18, 0.88)',
  border: 'rgba(255, 183, 3, 0.28)',
  borderSoft: 'rgba(255, 255, 255, 0.12)',
  accent: '#FFB703',
  accentWarm: '#F59E0B',
  accentGlow: 'rgba(255, 183, 3, 0.22)',
  text: '#FFF8F0',
  textMuted: 'rgba(255, 248, 240, 0.62)',
  textSoft: 'rgba(255, 248, 240, 0.45)',
  cta: '#FFB703',
  ctaText: '#1a0a12',
  success: '#6ee7b7',
  warn: '#FCD34D',
  mapOverlay: 'rgba(20, 8, 15, 0.42)',
} as const;

export const RESERVATION_TABLE_COLORS: Record<
  'available' | 'selected' | 'reserved' | 'closed' | 'mismatch',
  { fill: string; stroke: string; label: string; chair: string }
> = {
  available: { fill: '#1a3d32', stroke: '#6ee7b7', label: '#ecfdf5', chair: '#34d399' },
  selected: { fill: '#5c3d0a', stroke: '#FFB703', label: '#FFFBEB', chair: '#FCD34D' },
  reserved: { fill: '#2a2430', stroke: '#64748b', label: '#cbd5e1', chair: '#475569' },
  closed: { fill: '#1e1520', stroke: '#475569', label: '#94a3b8', chair: '#334155' },
  mismatch: { fill: '#312e4a', stroke: '#a78bfa', label: '#ede9fe', chair: '#818cf8' },
};
