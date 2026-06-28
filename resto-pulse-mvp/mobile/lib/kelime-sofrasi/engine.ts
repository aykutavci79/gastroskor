import { SOFRA_BONUS_HINT_THRESHOLD, SOFRA_MAX_IPUCU, SOFRA_MIN_KELIME_UZUNLUGU } from '@/constants/kelime-sofrasi';

import type { SofraGridCell, SofraPlacedWord, SofraPuzzle } from './types';
import { isSameAxisSubstring } from './grid-runs';
import { isTdkKelime } from './tdk-lexicon';
import { sofraKelimeBuyuk, sofraKelimeEsit } from './turkce-harf';

export function normalizeKelime(raw: string): string {
  return sofraKelimeBuyuk(raw);
}

export function kelimeCarktanOlusur(kelime: string, wheel: string[], path: number[]): boolean {
  const norm = sofraKelimeBuyuk(kelime);
  if (norm.length < SOFRA_MIN_KELIME_UZUNLUGU || path.length !== norm.length) {
    return false;
  }
  const used = new Set<number>();
  for (let i = 0; i < norm.length; i++) {
    const idx = path[i]!;
    if (used.has(idx) || wheel[idx] !== norm[i]) {
      return false;
    }
    used.add(idx);
  }
  return true;
}

export function harfCantasindanOlusur(kelime: string, wheel: string[]): boolean {
  const norm = sofraKelimeBuyuk(kelime);
  const bag = new Map<string, number>();
  for (const ch of wheel) {
    bag.set(ch, (bag.get(ch) ?? 0) + 1);
  }
  for (const ch of norm) {
    const left = bag.get(ch) ?? 0;
    if (left <= 0) return false;
    bag.set(ch, left - 1);
  }
  return true;
}

export function hedefKelimeMi(puzzle: SofraPuzzle, kelime: string): SofraPlacedWord | null {
  const norm = sofraKelimeBuyuk(kelime);
  return puzzle.words.find((w) => sofraKelimeEsit(w.kelime, norm)) ?? null;
}

/** Kısa kelime, aynı eksende henüz bulunmamış uzun kelimenin parçasıysa spoiler sayılır. */
export function sameAxisSubstringSpoiler(
  words: readonly SofraPlacedWord[],
  candidate: SofraPlacedWord,
  foundWordIds: readonly string[],
): SofraPlacedWord | null {
  const found = new Set(foundWordIds);
  for (const long of words) {
    if (long.id === candidate.id || found.has(long.id)) continue;
    if (isSameAxisSubstring(candidate, long)) return long;
  }
  return null;
}

/**
 * Swipe edilen kelime, aynı eksende henüz bulunmamış daha uzun kelimenin
 * hizalı alt dizisi mi? (YAK→YAKA önek; KAL→?KAL sonek — kısmi kutu doldurma yok)
 */
export function sameAxisAlignedSubstringOfUnfoundLonger(
  words: readonly SofraPlacedWord[],
  typedNorm: string,
  foundWordIds: readonly string[],
): SofraPlacedWord | null {
  const found = new Set(foundWordIds);
  if (typedNorm.length < SOFRA_MIN_KELIME_UZUNLUGU) return null;

  for (const long of words) {
    if (found.has(long.id)) continue;
    const longNorm = sofraKelimeBuyuk(long.kelime);
    if (longNorm.length <= typedNorm.length) continue;

    for (let offset = 0; offset <= longNorm.length - typedNorm.length; offset++) {
      if (longNorm.slice(offset, offset + typedNorm.length) !== typedNorm) continue;

      const aligned: SofraPlacedWord = {
        id: `__sub__:${long.id}:${offset}`,
        kelime: typedNorm,
        row: long.direction === 'h' ? long.row : long.row + offset,
        col: long.direction === 'h' ? long.col + offset : long.col,
        direction: long.direction,
      };
      if (isSameAxisSubstring(aligned, long)) return long;
    }
  }
  return null;
}

/** @deprecated sameAxisAlignedSubstringOfUnfoundLonger kullan */
export function sameAxisPrefixOfUnfoundLonger(
  words: readonly SofraPlacedWord[],
  typedNorm: string,
  foundWordIds: readonly string[],
): SofraPlacedWord | null {
  return sameAxisAlignedSubstringOfUnfoundLonger(words, typedNorm, foundWordIds);
}

/**
 * Swipe, henüz bulunmamış daha uzun hedef kelimenin parçası mı?
 * - Aynı eksende hizalı alt dizi (KAL → ?KAL)
 * - Izgara genelinde önek/sonek (GEL → GELİN, farklı sütun)
 */
export function partialOfUnfoundLongerTarget(
  words: readonly SofraPlacedWord[],
  typedNorm: string,
  foundWordIds: readonly string[],
): SofraPlacedWord | null {
  const axis = sameAxisAlignedSubstringOfUnfoundLonger(words, typedNorm, foundWordIds);
  if (axis) return axis;

  const found = new Set(foundWordIds);
  if (typedNorm.length < SOFRA_MIN_KELIME_UZUNLUGU) return null;

  for (const long of words) {
    if (found.has(long.id)) continue;
    const longNorm = sofraKelimeBuyuk(long.kelime);
    if (longNorm.length <= typedNorm.length) continue;
    if (longNorm.startsWith(typedNorm) || longNorm.endsWith(typedNorm)) {
      return long;
    }
  }
  return null;
}

/** Izgara dışı bonus: önceden üretilen liste veya çark harfleri + TDK sözlük. */
export function bonusKelimeMi(puzzle: SofraPuzzle, kelime: string): boolean {
  const norm = sofraKelimeBuyuk(kelime);
  if (norm.length < SOFRA_MIN_KELIME_UZUNLUGU) return false;
  if (hedefKelimeMi(puzzle, norm)) return false;
  if (puzzle.bonusKelimeler.some((w) => sofraKelimeEsit(w, norm))) return true;
  if (!harfCantasindanOlusur(norm, puzzle.wheel)) return false;
  return isTdkKelime(norm);
}

export function bulmacaTamamlandi(puzzle: SofraPuzzle, foundWordIds: string[]): boolean {
  return puzzle.words.every((w) => foundWordIds.includes(w.id));
}

export function gridHucreleriDoldur(
  grid: (SofraGridCell | null)[][],
  word: SofraPlacedWord,
): (SofraGridCell | null)[][] {
  const norm = sofraKelimeBuyuk(word.kelime);
  const next = grid.map((row) => row.map((cell) => (cell ? { ...cell, wordIds: [...cell.wordIds] } : null)));
  for (let i = 0; i < norm.length; i++) {
    const row = word.direction === 'h' ? word.row : word.row + i;
    const col = word.direction === 'h' ? word.col + i : word.col;
    const cell = next[row]?.[col];
    if (cell) {
      cell.letter = norm[i]!;
    }
  }
  return next;
}

export function carkKaristir(wheel: string[], order: number[], rand: () => number): number[] {
  const next = [...order];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [next[i], next[j]] = [next[j]!, next[i]!];
  }
  return next;
}

export function baslangicCarkSirasi(wheel: string[], rand: () => number): number[] {
  const order = wheel.map((_, i) => i);
  return carkKaristir(wheel, order, rand);
}

export function hucreAnahtar(row: number, col: number): string {
  return `${row},${col}`;
}

/** Kelimenin ızgara üzerindeki tüm hücre anahtarları (uzunluk sayımı değil). */
export function wordGridCellKeys(word: SofraPlacedWord): string[] {
  const norm = sofraKelimeBuyuk(word.kelime);
  const keys: string[] = [];
  for (let i = 0; i < norm.length; i++) {
    const row = word.direction === 'h' ? word.row : word.row + i;
    const col = word.direction === 'h' ? word.col + i : word.col;
    keys.push(hucreAnahtar(row, col));
  }
  return keys;
}

/**
 * Word Tracer `buildRevealedCells` uyumlu: ipucu hücreleri + bulunan kelime yolları.
 * @see _ref/wordtracer/src/game-engine.ts
 */
export function buildSofraRevealedCellKeys(
  words: readonly SofraPlacedWord[],
  foundWordIds: readonly string[],
  hintedCells: readonly string[],
): Set<string> {
  const revealed = new Set<string>(hintedCells);
  const found = new Set(foundWordIds);
  for (const word of words) {
    if (!found.has(word.id)) continue;
    if (sameAxisSubstringSpoiler(words, word, foundWordIds)) continue;
    const norm = sofraKelimeBuyuk(word.kelime);
    for (let i = 0; i < norm.length; i++) {
      const row = word.direction === 'h' ? word.row : word.row + i;
      const col = word.direction === 'h' ? word.col + i : word.col;
      revealed.add(hucreAnahtar(row, col));
    }
  }
  return revealed;
}

export function hucreAcikMi(
  cell: SofraGridCell,
  foundWordIds: string[],
  hintedCells: Set<string> | readonly string[],
  allWords?: readonly SofraPlacedWord[],
): boolean {
  if (!allWords?.length) {
    const hinted =
      hintedCells instanceof Set ? hintedCells : new Set(hintedCells);
    if (hinted.has(hucreAnahtar(cell.row, cell.col))) return true;
    return foundWordIds.some((id) => cell.wordIds.includes(id));
  }
  const hintedList = hintedCells instanceof Set ? [...hintedCells] : hintedCells;
  const revealed = buildSofraRevealedCellKeys(allWords, foundWordIds, hintedList);
  return revealed.has(hucreAnahtar(cell.row, cell.col));
}

/** Kelimenin tüm ızgara hücreleri ipucu ile açık mı? (kesişim prefilled sayılmaz) */
export function isWordFullyRevealed(
  word: SofraPlacedWord,
  puzzle: Pick<SofraPuzzle, 'grid'>,
  hintedCells: readonly string[],
): boolean {
  const hinted = new Set(hintedCells);
  const norm = sofraKelimeBuyuk(word.kelime);
  for (let i = 0; i < norm.length; i++) {
    const row = word.direction === 'h' ? word.row : word.row + i;
    const col = word.direction === 'h' ? word.col + i : word.col;
    const cell = puzzle.grid[row]?.[col];
    if (!cell || !cell.wordIds.includes(word.id)) return false;
    if (!hinted.has(hucreAnahtar(row, col))) return false;
  }
  return true;
}

/**
 * Word Tracer `autoSolveFullyRevealedAnswers` — tüm harfler açıldıysa kelime bulundu say.
 * Kısmi ipucu (YAK / 4 kutu) tek başına kelimeyi bitirmez.
 */
export function autoSolveFullyRevealedWordIds(
  puzzle: SofraPuzzle,
  foundWordIds: readonly string[],
  hintedCells: readonly string[],
): string[] {
  const found = new Set(foundWordIds);
  return puzzle.words
    .filter((w) => !found.has(w.id))
    .filter((w) => isWordFullyRevealed(w, puzzle, hintedCells))
    .map((w) => w.id);
}

/** @deprecated autoSolveFullyRevealedWordIds kullan */
export function ipucuIleOtomatikBulunanKelimeIdleri(
  puzzle: SofraPuzzle,
  foundWordIds: string[],
  hintedCells: readonly string[],
): string[] {
  return autoSolveFullyRevealedWordIds(puzzle, foundWordIds, hintedCells);
}

/** Henüz açılmamış rastgele bir ızgara hücresi seçer. */
export function sonrakiIpucuHucresi(
  puzzle: SofraPuzzle,
  foundWordIds: string[],
  hintedCells: string[],
  rand: () => number,
): { row: number; col: number; letter: string } | null {
  const hinted = new Set(hintedCells);
  const found = new Set(foundWordIds);
  const adaylar: { row: number; col: number; letter: string }[] = [];

  for (const row of puzzle.grid) {
    for (const cell of row) {
      if (!cell) continue;
      if (hinted.has(hucreAnahtar(cell.row, cell.col))) continue;
      if (cell.wordIds.some((id) => found.has(id))) continue;
      adaylar.push({ row: cell.row, col: cell.col, letter: cell.letter });
    }
  }

  if (!adaylar.length) return null;
  return adaylar[Math.floor(rand() * adaylar.length)]!;
}

export function sofraEarnedBonusHintTiers(bonusFoundCount: number): number {
  return Math.floor(bonusFoundCount / SOFRA_BONUS_HINT_THRESHOLD);
}

export function sofraBonusHintTiersClaimed(progress: {
  bonusFound: readonly string[];
  bonusHintTiersClaimed?: number;
}): number {
  if (typeof progress.bonusHintTiersClaimed === 'number') return progress.bonusHintTiersClaimed;
  return sofraEarnedBonusHintTiers(progress.bonusFound.length);
}

export function sofraPendingBonusHintClaims(progress: {
  bonusFound: readonly string[];
  bonusHintTiersClaimed?: number;
}): number {
  return Math.max(
    0,
    sofraEarnedBonusHintTiers(progress.bonusFound.length) - sofraBonusHintTiersClaimed(progress),
  );
}

/** Gunluk toplam ipucu hakki — yalnizca alinmis bonus odulleri ekler */
export function sofraMaxIpucu(claimedBonusHintTiers: number): number {
  return SOFRA_MAX_IPUCU + claimedBonusHintTiers;
}

/** Gunluk harcanan ipucu — eski kayitlarda hintedCells sayisi. */
export function sofraDailyHintsUsed(progress: {
  dailyHintsUsed?: number;
  hintedCells: readonly string[];
}): number {
  if (typeof progress.dailyHintsUsed === 'number') return progress.dailyHintsUsed;
  return progress.hintedCells.length;
}

export function sofraIpucuKalan(dailyHintsUsed: number, claimedBonusHintTiers = 0): number {
  return Math.max(0, sofraMaxIpucu(claimedBonusHintTiers) - dailyHintsUsed);
}

export function ipucuHakkiKaldi(dailyHintsUsed: number, claimedBonusHintTiers = 0): boolean {
  return dailyHintsUsed < sofraMaxIpucu(claimedBonusHintTiers);
}

export function bonusIpucuIlerleme(
  bonusFoundCount: number,
  pendingClaims = 0,
): {
  cycle: number;
  hedef: number;
} {
  const hedef = SOFRA_BONUS_HINT_THRESHOLD;
  if (pendingClaims > 0) {
    return { cycle: hedef, hedef };
  }
  return { cycle: bonusFoundCount % SOFRA_BONUS_HINT_THRESHOLD, hedef };
}
