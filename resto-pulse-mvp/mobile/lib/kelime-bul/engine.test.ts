import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { eslesenKelime, uretKelimeBulBulmaca, yolMetni } from './engine';
import { kelimeBulGenelHavuz, KELIME_BUL_YEMEK_RAW } from './words';
import { sofraKelimeBuyuk } from '@/lib/kelime-sofrasi/turkce-harf';

const SCAN_DIRS = [
  { dr: 0, dc: 1 },
  { dr: 1, dc: 0 },
  { dr: 1, dc: 1 },
  { dr: -1, dc: 1 },
  { dr: 0, dc: -1 },
  { dr: -1, dc: 0 },
  { dr: -1, dc: -1 },
  { dr: 1, dc: -1 },
] as const;

function findWordOnGrid(grid: string[][], word: string): { row: number; col: number }[] | null {
  const size = grid.length;
  const target = sofraKelimeBuyuk(word);
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      for (const { dr, dc } of SCAN_DIRS) {
        const path: { row: number; col: number }[] = [];
        for (let i = 0; i < target.length; i++) {
          const r = row + dr * i;
          const c = col + dc * i;
          if (r < 0 || c < 0 || r >= size || c >= size) break;
          path.push({ row: r, col: c });
        }
        if (path.length !== target.length) continue;
        const text = yolMetni(grid, path);
        if (eslesenKelime(text, [target])) return path;
      }
    }
  }
  return null;
}

describe('kelime-bul engine', () => {
  it('uretKelimeBulBulmaca places all words', () => {
    const puzzle = uretKelimeBulBulmaca('test-seed-123');
    assert.equal(puzzle.grid.length, 10);
    assert.ok(puzzle.words.length >= 5);
    assert.ok(puzzle.words.every((w) => w.length <= 9));
  });

  it('eslesenKelime accepts reverse selection', () => {
    const match = eslesenKelime('PABEK', ['KEBAP']);
    assert.equal(match, 'KEBAP');
  });

  it('pickWords includes one food-themed word when general pool available', () => {
    const puzzle = uretKelimeBulBulmaca('test-food-mix-789');
    const yemekSet = new Set(KELIME_BUL_YEMEK_RAW.map(sofraKelimeBuyuk));
    assert.ok(
      puzzle.words.some((w) => yemekSet.has(sofraKelimeBuyuk(w))),
      'expected at least one food word in puzzle',
    );
  });

  it('every generated word is readable from grid path', () => {
    const puzzle = uretKelimeBulBulmaca('test-seed-456');
    for (const word of puzzle.words) {
      const path = findWordOnGrid(puzzle.grid, word);
      assert.ok(path, `word not on grid: ${word}`);
      const text = yolMetni(puzzle.grid, path!);
      assert.equal(eslesenKelime(text, puzzle.words), sofraKelimeBuyuk(word));
    }
  });

  it('genel havuz excludes foreign or obscure lexicon entries', () => {
    const pool = new Set(kelimeBulGenelHavuz().map(sofraKelimeBuyuk));
    for (const word of ['MORTO', 'OZUGA', 'HERTZ', 'KİLİZ']) {
      assert.ok(!pool.has(sofraKelimeBuyuk(word)), `unexpected word in pool: ${word}`);
    }
  });

  it('generated puzzles avoid disallowed words across seeds', () => {
    const blocked = new Set(['MORTO', 'OZUGA', 'HERTZ', 'KİLİZ'].map(sofraKelimeBuyuk));
    for (let i = 0; i < 30; i++) {
      const puzzle = uretKelimeBulBulmaca(`quality-seed-${i}`);
      for (const word of puzzle.words) {
        assert.ok(!blocked.has(sofraKelimeBuyuk(word)), `blocked word in puzzle: ${word}`);
      }
    }
  });
});
