export type EglenceZorluk = 'kolay' | 'orta' | 'zor';

export const EGLENCE_ZORLUK_SECENEKLERI: EglenceZorluk[] = ['kolay', 'orta', 'zor'];

export const SOFRA_KELIME_HEDEF: Record<EglenceZorluk, number> = {
  kolay: 5,
  orta: 6,
  zor: 7,
};

/** 9×9 tabloda verilen hücre sayısı — yüksek = kolay */
export const SUDOKU_9X9_GIVENS: Record<'kolay' | 'orta' | 'zor', number> = {
  kolay: 40,
  orta: 32,
  zor: 26,
};

/** @deprecated SUDOKU_9X9_GIVENS kullan */
export const SUDOKU_6X6_GIVENS = SUDOKU_9X9_GIVENS;

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

export function sofraPuzzleKey(gunId: string, zorluk: EglenceZorluk, tur = 0): string {
  const base = `${gunId}:${zorluk}`;
  return tur > 0 ? `${base}:t${tur}` : base;
}

/** puzzleId → tur indeksi (tur 0 = ilk oyun). */
export function sofraTurFromPuzzleId(
  puzzleId: string,
  gunId: string,
  zorluk: EglenceZorluk,
): number {
  const base = `${gunId}:${zorluk}`;
  if (puzzleId === base) return 0;
  const prefix = `${base}:t`;
  if (!puzzleId.startsWith(prefix)) return 0;
  const n = Number.parseInt(puzzleId.slice(prefix.length), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function sudokuPuzzleKey(gunId: string, zorluk: 'kolay' | 'orta' | 'zor'): string {
  return `${gunId}:sudoku:${zorluk}`;
}
