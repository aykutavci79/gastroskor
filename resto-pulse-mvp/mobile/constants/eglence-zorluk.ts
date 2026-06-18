export type EglenceZorluk = 'kolay' | 'orta' | 'zor';

export const EGLENCE_ZORLUK_SECENEKLERI: EglenceZorluk[] = ['kolay', 'orta', 'zor'];

export const SOFRA_KELIME_HEDEF: Record<EglenceZorluk, number> = {
  kolay: 5,
  orta: 6,
  zor: 7,
};

/** 6×6 tabloda verilen hücre sayısı — yüksek = kolay */
export const SUDOKU_6X6_GIVENS: Record<'kolay' | 'orta', number> = {
  kolay: 24,
  orta: 14,
};

export function eglenceZorlukEtiket(z: EglenceZorluk): string {
  if (z === 'kolay') return 'Kolay';
  if (z === 'orta') return 'Orta';
  return 'Zor';
}

export function parseEglenceZorluk(raw: string | string[] | undefined): EglenceZorluk {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === 'kolay' || v === 'orta' || v === 'zor') return v;
  return 'orta';
}

export function sofraPuzzleKey(gunId: string, zorluk: EglenceZorluk): string {
  return `${gunId}:${zorluk}`;
}

export function sudokuPuzzleKey(gunId: string, zorluk: 'kolay' | 'orta'): string {
  return `${gunId}:sudoku:${zorluk}`;
}
