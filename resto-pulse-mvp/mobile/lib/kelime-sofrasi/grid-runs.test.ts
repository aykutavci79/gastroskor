import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { auditContiguousRuns, extractGridRuns, type GridMap } from './grid-runs';

function rowRun(word: string): GridMap {
  const grid: GridMap = new Map();
  [...word].forEach((letter, col) => {
    grid.set(`0,${col}`, { letter, wordIds: [`w-${col}`] });
  });
  return grid;
}

describe('grid run extraction', () => {
  it('keeps contiguous letters in a row run', () => {
    assert.deepEqual(extractGridRuns(rowRun('KARA')), ['KARA']);
  });

  it('rejects valid dictionary runs that are not target words', () => {
    const audit = auditContiguousRuns(rowRun('KARA'), new Set(), new Set());

    assert.equal(audit.ok, false);
    assert.deepEqual(audit.invalid, ['orphan:KARA']);
    assert.equal(audit.mustRejectPlacement, true);
  });
});
