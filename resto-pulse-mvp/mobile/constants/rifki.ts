import type { TileColor } from '@/lib/rifki/matchEngine';

export const RIFKI_THEME = {
  bg: '#2A1810',
  bgDeep: '#1A1008',
  text: '#FFF7ED',
  muted: '#C4A882',
  accent: '#FFB347',
  accentSoft: 'rgba(255, 171, 96, 0.38)',
  panel: 'rgba(44, 28, 16, 0.94)',
  border: 'rgba(139, 94, 60, 0.55)',
  danger: '#F87171',
  success: '#4ADE80',
} as const;

/** Ahşap / taş paleti — G1 sahne kabuğu */
export const RIFKI_WOOD = {
  frame: '#4A3020',
  frameDark: '#2E1E12',
  plank: '#C4956A',
  plankMid: '#A67C52',
  plankDark: '#7A5234',
  plankLight: '#E0B888',
  grain: 'rgba(60, 36, 20, 0.22)',
  tunnel: '#3D2818',
  tunnelInner: '#2A1810',
} as const;

export const RIFKI_STONE = {
  light: '#C8C4BE',
  mid: '#9E9A94',
  dark: '#72706A',
  shadow: 'rgba(0,0,0,0.25)',
} as const;

/** Gastro temalı match-3 taşları */
export const RIFKI_TILE_EMOJI: Record<TileColor, string> = {
  KIRMIZI: '🍅',
  MAVI: '🫐',
  YESIL: '🥬',
  SARI: '🍋',
  MOR: '🍆',
};

export const RIFKI_ENEMY_EMOJI = {
  YILAN: '🐍',
  CIYAN: '🦂',
} as const;

export const RIFKI_CHARACTER_EMOJI = '👨‍🍳';

/** Taş tüneli yolu — normalize koordinatlar (0–1) */
export const RIFKI_TUNNEL_STONES: { x: number; y: number; r: number }[] = [
  { x: 0.04, y: 0.72, r: 5 }, { x: 0.08, y: 0.65, r: 4 }, { x: 0.1, y: 0.78, r: 5 },
  { x: 0.14, y: 0.58, r: 4 }, { x: 0.16, y: 0.7, r: 5 }, { x: 0.18, y: 0.82, r: 4 },
  { x: 0.22, y: 0.52, r: 5 }, { x: 0.24, y: 0.64, r: 4 }, { x: 0.26, y: 0.76, r: 5 },
  { x: 0.28, y: 0.48, r: 4 }, { x: 0.3, y: 0.6, r: 5 }, { x: 0.32, y: 0.72, r: 4 },
  { x: 0.34, y: 0.44, r: 5 }, { x: 0.36, y: 0.56, r: 4 }, { x: 0.38, y: 0.68, r: 5 },
  { x: 0.4, y: 0.4, r: 4 }, { x: 0.42, y: 0.52, r: 5 }, { x: 0.44, y: 0.64, r: 4 },
  { x: 0.46, y: 0.38, r: 5 }, { x: 0.48, y: 0.5, r: 4 }, { x: 0.5, y: 0.62, r: 5 },
  { x: 0.52, y: 0.36, r: 4 }, { x: 0.54, y: 0.48, r: 5 }, { x: 0.56, y: 0.6, r: 4 },
  { x: 0.58, y: 0.34, r: 5 }, { x: 0.6, y: 0.46, r: 4 }, { x: 0.62, y: 0.58, r: 5 },
  { x: 0.64, y: 0.32, r: 4 }, { x: 0.66, y: 0.44, r: 5 }, { x: 0.68, y: 0.56, r: 4 },
  { x: 0.7, y: 0.3, r: 5 }, { x: 0.72, y: 0.42, r: 4 }, { x: 0.74, y: 0.54, r: 5 },
  { x: 0.76, y: 0.28, r: 4 }, { x: 0.78, y: 0.4, r: 5 }, { x: 0.8, y: 0.52, r: 4 },
  { x: 0.05, y: 0.55, r: 3 }, { x: 0.12, y: 0.48, r: 3 }, { x: 0.2, y: 0.42, r: 3 },
  { x: 0.35, y: 0.3, r: 3 }, { x: 0.45, y: 0.28, r: 3 }, { x: 0.55, y: 0.26, r: 3 },
  { x: 0.65, y: 0.24, r: 3 }, { x: 0.75, y: 0.22, r: 3 },
];
