import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  cloneGrid,
  countSolutions,
  eliminateNotesForDigit,
  isValidPlacement,
  solveGrid,
} from './engine';
import type { Digit } from './constants';
import type { Grid } from './types';

const SOLVED_GRID: Grid = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9],
];

const UNIQUE_PUZZLE: Grid = [
  [5, 3, 0, 0, 7, 0, 0, 0, 0],
  [6, 0, 0, 1, 9, 5, 0, 0, 0],
  [0, 9, 8, 0, 0, 0, 0, 6, 0],
  [8, 0, 0, 0, 6, 0, 0, 0, 3],
  [4, 0, 0, 8, 0, 3, 0, 0, 1],
  [7, 0, 0, 0, 2, 0, 0, 0, 6],
  [0, 6, 0, 0, 0, 0, 2, 8, 0],
  [0, 0, 0, 4, 1, 9, 0, 0, 5],
  [0, 0, 0, 0, 8, 0, 0, 7, 9],
];

function notesWith(...digits: Digit[]): Digit[][][] {
  return Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => [...digits]),
  );
}

describe('mini-sudoku engine', () => {
  it('solveGrid completes a deterministic unique puzzle', () => {
    const grid = cloneGrid(UNIQUE_PUZZLE);

    assert.equal(solveGrid(grid), true);
    assert.deepEqual(grid, SOLVED_GRID);
  });

  it('countSolutions verifies uniqueness without mutating the candidate grid', () => {
    const grid = cloneGrid(UNIQUE_PUZZLE);
    const before = cloneGrid(grid);

    assert.equal(countSolutions(grid, 2), 1);
    assert.deepEqual(grid, before);
  });

  it('isValidPlacement rejects row, column, box, and out-of-range conflicts', () => {
    assert.equal(isValidPlacement(UNIQUE_PUZZLE, 0, 2, 4), true);
    assert.equal(isValidPlacement(UNIQUE_PUZZLE, 0, 2, 5), false, 'row conflict');
    assert.equal(isValidPlacement(UNIQUE_PUZZLE, 0, 2, 8), false, 'column conflict');
    assert.equal(isValidPlacement(UNIQUE_PUZZLE, 0, 2, 6), false, 'box conflict');
    assert.equal(isValidPlacement(UNIQUE_PUZZLE, 0, 2, 10), false, 'out of range');
  });

  it('eliminateNotesForDigit clears placed cell and peer notes only', () => {
    const notes = notesWith(1, 5);
    const next = eliminateNotesForDigit(notes, 0, 0, 5);

    assert.deepEqual(next[0]![0], [], 'placed cell notes are cleared');
    assert.deepEqual(next[0]![4], [1], 'same row peer loses digit');
    assert.deepEqual(next[4]![0], [1], 'same column peer loses digit');
    assert.deepEqual(next[1]![1], [1], 'same box peer loses digit');
    assert.deepEqual(next[4]![4], [1, 5], 'non-peer note is preserved');
    assert.deepEqual(notes[0]![4], [1, 5], 'original notes are not mutated');
  });
});
