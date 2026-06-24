import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { auditContiguousRuns, extractGridRuns, type GridMap } from './grid-runs.ts';
import { tdkLexicon } from './tdk-lexicon.ts';

function rowRun(word: string): GridMap {
  const grid: GridMap = new Map();
  [...word].forEach((letter, col) => {
    grid.set(`0,${col}`, { letter, wordIds: [`w${col}`] });
  });
  return grid;
}

describe('extractGridRuns', () => {
  it('keeps contiguous letters in the same run', () => {
    assert.deepEqual(extractGridRuns(rowRun('KARA')), ['KARA']);
  });
});

describe('auditContiguousRuns', () => {
  it('rejects valid dictionary runs that are not target words', () => {
    const audit = auditContiguousRuns(rowRun('KARA'), new Set(['KAR']), tdkLexicon(), 3);

    assert.equal(audit.ok, false);
    assert.ok(audit.invalid.includes('orphan:KARA'));
  });
});
