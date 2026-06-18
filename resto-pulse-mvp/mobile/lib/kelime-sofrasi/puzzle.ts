import { SOFRA_MAX_HEDEF, SOFRA_MIN_HEDEF } from '@/constants/kelime-sofrasi';
import type { HavuzKelime } from '@/lib/kelime-sofrasi/havuz';
import { havuzKelimeFiltre } from '@/lib/kelime-sofrasi/havuz';
import { cevapNormalize } from '@/lib/kelime-yarismasi/turkce-metin';
import { mulberry32, seedFromString, shuffled } from '@/lib/mini-sudoku/rng';
import { activePuzzleId } from '@/lib/mini-sudoku/schedule';

import type { SofraGridCell, SofraPlacedWord, SofraPuzzle } from './types';

type Template = {
  hLen: number;
  verticals: { crossAt: number; len: number }[];
};

const TEMPLATES: Template[] = [
  { hLen: 6, verticals: [{ crossAt: 1, len: 4 }] },
  { hLen: 6, verticals: [{ crossAt: 3, len: 4 }] },
  { hLen: 5, verticals: [{ crossAt: 1, len: 4 }] },
  { hLen: 5, verticals: [{ crossAt: 2, len: 4 }] },
  { hLen: 6, verticals: [{ crossAt: 1, len: 4 }, { crossAt: 4, len: 3 }] },
  { hLen: 5, verticals: [{ crossAt: 0, len: 3 }, { crossAt: 4, len: 3 }] },
  { hLen: 6, verticals: [{ crossAt: 2, len: 3 }, { crossAt: 5, len: 3 }] },
];

const FALLBACK: { kelimeler: string[]; ipuclari: string[] } = {
  kelimeler: ['BALIK', 'KAL', 'PIL'],
  ipuclari: ['Deniz veya tatlı suda yaşayan hayvan', 'Almak anlamında kısa fiil', 'Pilates kısaltması değil — ampul içi tel'],
};

function verticalCrossIndex(len: number): number {
  return Math.floor((len - 1) / 2);
}

function pickVertical(
  pool: HavuzKelime[],
  crossLetter: string,
  len: number,
  used: Set<string>,
  rand: () => number,
): HavuzKelime | null {
  const mid = verticalCrossIndex(len);
  const candidates = pool.filter((w) => {
    const norm = cevapNormalize(w.kelime);
    if (norm.length !== len || used.has(norm)) return false;
    return norm[mid] === crossLetter;
  });
  if (!candidates.length) return null;
  return candidates[Math.floor(rand() * candidates.length)]!;
}

function buildFromAnchor(
  anchor: HavuzKelime,
  template: Template,
  pool: HavuzKelime[],
  rand: () => number,
): SofraPlacedWord[] | null {
  const horizontal = cevapNormalize(anchor.kelime);
  if (horizontal.length !== template.hLen) return null;

  const used = new Set<string>([horizontal]);
  const hRow = Math.max(...template.verticals.map((v) => verticalCrossIndex(v.len)));
  const placed: SofraPlacedWord[] = [
    {
      id: anchor.id,
      kelime: horizontal,
      ipucu: anchor.ipucu,
      row: hRow,
      col: 0,
      direction: 'h',
    },
  ];

  for (let i = 0; i < template.verticals.length; i++) {
    const spec = template.verticals[i]!;
    const crossLetter = horizontal[spec.crossAt];
    if (!crossLetter) return null;
    const picked = pickVertical(pool, crossLetter, spec.len, used, rand);
    if (!picked) return null;
    const norm = cevapNormalize(picked.kelime);
    used.add(norm);
    const vCross = verticalCrossIndex(spec.len);
    placed.push({
      id: `${anchor.id}-v${i}`,
      kelime: norm,
      ipucu: picked.ipucu,
      row: hRow - vCross,
      col: spec.crossAt,
      direction: 'v',
    });
  }

  return placed;
}

function compileGrid(words: SofraPlacedWord[]): {
  grid: (SofraGridCell | null)[][];
  rows: number;
  cols: number;
} {
  let maxRow = 0;
  let maxCol = 0;
  for (const w of words) {
    const len = cevapNormalize(w.kelime).length;
    maxRow = Math.max(maxRow, w.direction === 'h' ? w.row : w.row + len - 1);
    maxCol = Math.max(maxCol, w.direction === 'h' ? w.col + len - 1 : w.col);
  }
  const rows = maxRow + 1;
  const cols = maxCol + 1;
  const grid: (SofraGridCell | null)[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => null),
  );

  for (const w of words) {
    const norm = cevapNormalize(w.kelime);
    for (let i = 0; i < norm.length; i++) {
      const row = w.direction === 'h' ? w.row : w.row + i;
      const col = w.direction === 'h' ? w.col + i : w.col;
      const letter = norm[i]!;
      const existing = grid[row]![col];
      if (existing) {
        if (existing.letter !== letter) {
          throw new Error('Sofra grid çakışması');
        }
        if (!existing.wordIds.includes(w.id)) {
          existing.wordIds.push(w.id);
        }
      } else {
        grid[row]![col] = { row, col, letter, wordIds: [w.id] };
      }
    }
  }

  return { grid, rows, cols };
}

function buildWheel(words: SofraPlacedWord[], rand: () => number): string[] {
  const letters: string[] = [];
  for (const w of words) {
    letters.push(...[...cevapNormalize(w.kelime)]);
  }
  return shuffled(letters, rand);
}

function fallbackPuzzle(puzzleId: string, rand: () => number): SofraPuzzle {
  const words: SofraPlacedWord[] = [
    {
      id: 'fb-h',
      kelime: cevapNormalize(FALLBACK.kelimeler[0]!),
      ipucu: FALLBACK.ipuclari[0],
      row: 1,
      col: 0,
      direction: 'h',
    },
    {
      id: 'fb-v1',
      kelime: cevapNormalize(FALLBACK.kelimeler[1]!),
      ipucu: FALLBACK.ipuclari[1],
      row: 0,
      col: 1,
      direction: 'v',
    },
    {
      id: 'fb-v2',
      kelime: cevapNormalize(FALLBACK.kelimeler[2]!),
      ipucu: FALLBACK.ipuclari[2],
      row: 0,
      col: 3,
      direction: 'v',
    },
  ];
  const { grid, rows, cols } = compileGrid(words);
  return {
    id: puzzleId,
    words,
    wheel: buildWheel(words, rand),
    rows,
    cols,
    grid,
  };
}

export function buildDailySofraPuzzle(puzzleId = activePuzzleId()): SofraPuzzle {
  const rand = mulberry32(seedFromString(`gastro-kelime-sofrasi:${puzzleId}`));
  const pool = havuzKelimeFiltre(3, 7);
  const templates = shuffled(TEMPLATES, rand);
  const anchors = shuffled(pool.filter((w) => w.kelime.length >= 5 && w.kelime.length <= 7), rand);

  for (const template of templates) {
    const slice = anchors.filter((w) => w.kelime.length === template.hLen);
    for (const anchor of slice.slice(0, 80)) {
      const placed = buildFromAnchor(anchor, template, pool, rand);
      if (!placed) continue;
      const count = placed.length;
      if (count < SOFRA_MIN_HEDEF || count > SOFRA_MAX_HEDEF) continue;
      const { grid, rows, cols } = compileGrid(placed);
      return {
        id: puzzleId,
        words: placed,
        wheel: buildWheel(placed, rand),
        rows,
        cols,
        grid,
      };
    }
  }

  return fallbackPuzzle(puzzleId, rand);
}

export function todaySofraPuzzleId(now = new Date()): string {
  return activePuzzleId(now);
}
