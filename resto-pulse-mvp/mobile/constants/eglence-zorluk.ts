export type EglenceZorluk = 'kolay' | 'orta' | 'zor';

export const EGLENCE_ZORLUK_SECENEKLERI: EglenceZorluk[] = ['kolay', 'orta', 'zor'];

/** Izgara kelime sayısı alt sınırı (zor: esnek 5–6). */
export const SOFRA_KELIME_MIN: Record<EglenceZorluk, number> = {
  kolay: 5,
  orta: 6,
  zor: 5,
};

/** Izgara kelime sayısı üst sınırı — packer ve AI hedefi. */
export const SOFRA_KELIME_MAX: Record<EglenceZorluk, number> = {
  kolay: 5,
  orta: 6,
  zor: 6,
};

/** @deprecated SOFRA_KELIME_MAX kullan */
export const SOFRA_KELIME_HEDEF: Record<EglenceZorluk, number> = SOFRA_KELIME_MAX;

export function sofraKelimeSayisiGecerli(zorluk: EglenceZorluk, count: number): boolean {
  return count >= SOFRA_KELIME_MIN[zorluk] && count <= SOFRA_KELIME_MAX[zorluk];
}

export function sofraKelimeHedefEtiket(z: EglenceZorluk): string {
  const min = SOFRA_KELIME_MIN[z];
  const max = SOFRA_KELIME_MAX[z];
  if (min === max) return `${min} kelime`;
  return `${min}–${max} kelime`;
}

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
