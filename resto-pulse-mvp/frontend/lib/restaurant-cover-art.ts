import type { CategoryVisualKind } from '@/lib/restaurant-category-visual';

export type CoverArtPreset = {
  /** Arka plan — doygun, iştah açıcı */
  background: string;
  /** Parlama lekesi */
  glow: string;
  /** İkincil dekor emojileri */
  accents: string[];
};

const PRESETS: Record<CategoryVisualKind, CoverArtPreset> = {
  pizza: {
    background: 'from-[#c2410c] via-[#ea580c] to-[#7c2d12]',
    glow: 'bg-orange-400/35',
    accents: ['🧀', '🍅', '🌿'],
  },
  kebab: {
    background: 'from-[#b45309] via-[#d97706] to-[#78350f]',
    glow: 'bg-amber-300/40',
    accents: ['🧅', '🌶️', '🥩'],
  },
  burger: {
    background: 'from-[#ca8a04] via-[#eab308] to-[#854d0e]',
    glow: 'bg-yellow-200/30',
    accents: ['🍟', '🧀', '🥬'],
  },
  dessert: {
    background: 'from-[#db2777] via-[#ec4899] to-[#831843]',
    glow: 'bg-pink-200/35',
    accents: ['🍫', '🍓', '✨'],
  },
  coffee: {
    background: 'from-[#57534e] via-[#78716c] to-[#292524]',
    glow: 'bg-amber-200/25',
    accents: ['🥐', '🍪', '☕'],
  },
  seafood: {
    background: 'from-[#0369a1] via-[#0ea5e9] to-[#164e63]',
    glow: 'bg-cyan-200/30',
    accents: ['🦐', '🍋', '🌊'],
  },
  breakfast: {
    background: 'from-[#ca8a04] via-[#fbbf24] to-[#a16207]',
    glow: 'bg-yellow-100/35',
    accents: ['🍞', '🧈', '🍯'],
  },
  general: {
    background: 'from-[#059669] via-[#10b981] to-[#064e3b]',
    glow: 'bg-emerald-200/30',
    accents: ['🍴', '✨', '🔥'],
  },
};

function hashLabel(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) {
    h = (h * 31 + text.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function getCoverArtPreset(kind: CategoryVisualKind, seed = ''): CoverArtPreset {
  const base = PRESETS[kind] ?? PRESETS.general;
  if (!seed) return base;
  const h = hashLabel(seed);
  const rotated = [...base.accents.slice(h % base.accents.length), ...base.accents.slice(0, h % base.accents.length)];
  return { ...base, accents: rotated };
}
