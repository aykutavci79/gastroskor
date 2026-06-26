import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Digit } from './constants';
import {
  autoCompleteFromSolution,
  eliminateNotesForDigit,
  emptyNotes,
  filledCellsMatchSolution,
  remainingDigitCounts,
} from './engine';
import type { Grid } from './types';

const SOLUTION: Grid = [
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

function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => [...row]);
}

describe('mini-sudoku engine', () => {
  it('eliminates placed digit notes from row, column, and box peers only', () => {
    const notes = emptyNotes();
    notes[0]![0] = [5];
    notes[0]![1] = [2, 5];
    notes[1]![0] = [3, 5];
    notes[1]![1] = [4, 5];
    notes[4]![4] = [5, 6];

    const next = eliminateNotesForDigit(notes, 0, 0, 5);

    assert.deepEqual(next[0]![0], []);
    assert.deepEqual(next[0]![1], [2]);
    assert.deepEqual(next[1]![0], [3]);
    assert.deepEqual(next[1]![1], [4]);
    assert.deepEqual(next[4]![4], [5, 6]);
    assert.deepEqual(notes[0]![1], [2, 5]);
  });

  it('auto-completes empty cells and clears affected notes without mutating inputs', () => {
    const values = cloneGrid(SOLUTION);
    values[0]![0] = 0;
    values[8]![8] = 0;

    const notes = emptyNotes();
    notes[0]![0] = [1, 5];
    notes[0]![1] = [5, 6];
    notes[1]![1] = [5, 7];
    notes[4]![4] = [5, 9];
    notes[8]![0] = [8, 9];
    notes[7]![7] = [1, 9];
    const originalNotes = notes.map((row) => row.map((cell) => [...cell]));

    const completed = autoCompleteFromSolution(values, notes, SOLUTION);

    assert.deepEqual(completed.values, SOLUTION);
    assert.deepEqual(completed.notes[0]![0], []);
    assert.deepEqual(completed.notes[0]![1], [6]);
    assert.deepEqual(completed.notes[1]![1], [7]);
    assert.deepEqual(completed.notes[4]![4], [5, 9]);
    assert.deepEqual(completed.notes[8]![8], []);
    assert.deepEqual(completed.notes[8]![0], [8]);
    assert.deepEqual(completed.notes[7]![7], [1]);
    assert.equal(values[0]![0], 0);
    assert.deepEqual(notes, originalNotes);
  });

  it('reports remaining digit counts without going below zero', () => {
    const values = cloneGrid(SOLUTION);
    values[0]![0] = 1;
    values[0]![1] = 1;

    const counts = remainingDigitCounts(SOLUTION, values);

    assert.equal(counts[1 as Digit], 0);
    assert.equal(counts[3 as Digit], 1);
    assert.equal(counts[5 as Digit], 1);
  });

  it('detects filled cells that do not match the solution', () => {
    const values = cloneGrid(SOLUTION);
    values[4]![4] = 0;
    assert.equal(filledCellsMatchSolution(values, SOLUTION), true);

    values[4]![4] = 9;
    assert.equal(filledCellsMatchSolution(values, SOLUTION), false);
  });
});
