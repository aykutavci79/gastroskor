import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  applyGravity,
  createGrid,
  findMatches,
  hasAnyValidMove,
  isValidSwap,
  processBoard,
  removeMatches,
  swapTiles,
  type Grid,
  type Tile,
  type TileColor,
  RIFKI_GRID_SIZE,
} from './matchEngine';
import { createTile, resetTileIdCounter } from './gridHelpers';

function buildGrid(colors: TileColor[][]): Grid {
  resetTileIdCounter();
  return colors.map((row, rowIndex) =>
    row.map((color, colIndex) => createTile(color, rowIndex, colIndex)),
  );
}

describe('rifki matchEngine', () => {
  it('createGrid returns 7x7 without initial matches', () => {
    const grid = createGrid();
    assert.equal(grid.length, RIFKI_GRID_SIZE);
    assert.equal(grid[0]?.length, RIFKI_GRID_SIZE);
    assert.equal(findMatches(grid).length, 0);
    assert.equal(hasAnyValidMove(grid), true);
  });

  it('findMatches detects horizontal and vertical runs', () => {
    const grid = buildGrid([
      ['KIRMIZI', 'KIRMIZI', 'KIRMIZI', 'MAVI', 'YESIL', 'SARI', 'MOR'],
      ['MAVI', 'YESIL', 'SARI', 'MOR', 'KIRMIZI', 'MAVI', 'YESIL'],
      ['YESIL', 'SARI', 'MOR', 'KIRMIZI', 'MAVI', 'YESIL', 'SARI'],
      ['SARI', 'MOR', 'KIRMIZI', 'MAVI', 'YESIL', 'SARI', 'MOR'],
      ['MOR', 'KIRMIZI', 'MAVI', 'YESIL', 'SARI', 'MOR', 'KIRMIZI'],
      ['KIRMIZI', 'MAVI', 'YESIL', 'SARI', 'MOR', 'KIRMIZI', 'MAVI'],
      ['MAVI', 'YESIL', 'SARI', 'MOR', 'KIRMIZI', 'MAVI', 'YESIL'],
    ]);

    const matches = findMatches(grid);
    assert.equal(matches.length, 1);
    assert.equal(matches[0]?.length, 3);
  });

  it('processBoard cascades and scores matches', () => {
    const grid = buildGrid([
      ['KIRMIZI', 'KIRMIZI', 'KIRMIZI', 'MAVI', 'YESIL', 'SARI', 'MOR'],
      ['MAVI', 'YESIL', 'SARI', 'MOR', 'KIRMIZI', 'MAVI', 'YESIL'],
      ['YESIL', 'SARI', 'MOR', 'KIRMIZI', 'MAVI', 'YESIL', 'SARI'],
      ['SARI', 'MOR', 'KIRMIZI', 'MAVI', 'YESIL', 'SARI', 'MOR'],
      ['MOR', 'KIRMIZI', 'MAVI', 'YESIL', 'SARI', 'MOR', 'KIRMIZI'],
      ['KIRMIZI', 'MAVI', 'YESIL', 'SARI', 'MOR', 'KIRMIZI', 'MAVI'],
      ['MAVI', 'YESIL', 'SARI', 'MOR', 'KIRMIZI', 'MAVI', 'YESIL'],
    ]);

    const { steps, totalScore } = processBoard(grid);
    assert.ok(steps.length >= 1);
    assert.equal(totalScore, 100);
    assert.equal(findMatches(steps[steps.length - 1]!).length, 0);
  });

  it('isValidSwap requires adjacent cells that create a match', () => {
    const grid = buildGrid([
      ['KIRMIZI', 'MAVI', 'KIRMIZI', 'MAVI', 'YESIL', 'SARI', 'MOR'],
      ['MAVI', 'KIRMIZI', 'YESIL', 'SARI', 'MOR', 'KIRMIZI', 'MAVI'],
      ['YESIL', 'SARI', 'MOR', 'KIRMIZI', 'MAVI', 'YESIL', 'SARI'],
      ['SARI', 'MOR', 'KIRMIZI', 'MAVI', 'YESIL', 'SARI', 'MOR'],
      ['MOR', 'KIRMIZI', 'MAVI', 'YESIL', 'SARI', 'MOR', 'KIRMIZI'],
      ['KIRMIZI', 'MAVI', 'YESIL', 'SARI', 'MOR', 'KIRMIZI', 'MAVI'],
      ['MAVI', 'YESIL', 'SARI', 'MOR', 'KIRMIZI', 'MAVI', 'YESIL'],
    ]);

    assert.equal(isValidSwap(grid, 0, 1, 1, 1), true);
    assert.equal(isValidSwap(grid, 0, 0, 1, 0), false);
  });

  it('swapTiles exchanges two cells', () => {
    const grid = buildGrid([
      ['KIRMIZI', 'MAVI', 'YESIL', 'SARI', 'MOR', 'KIRMIZI', 'MAVI'],
      ['MAVI', 'YESIL', 'SARI', 'MOR', 'KIRMIZI', 'MAVI', 'YESIL'],
      ['YESIL', 'SARI', 'MOR', 'KIRMIZI', 'MAVI', 'YESIL', 'SARI'],
      ['SARI', 'MOR', 'KIRMIZI', 'MAVI', 'YESIL', 'SARI', 'MOR'],
      ['MOR', 'KIRMIZI', 'MAVI', 'YESIL', 'SARI', 'MOR', 'KIRMIZI'],
      ['KIRMIZI', 'MAVI', 'YESIL', 'SARI', 'MOR', 'KIRMIZI', 'MAVI'],
      ['MAVI', 'YESIL', 'SARI', 'MOR', 'KIRMIZI', 'MAVI', 'YESIL'],
    ]);

    const swapped = swapTiles(grid, 0, 0, 0, 1);
    assert.equal(swapped[0]?.[0]?.color, 'MAVI');
    assert.equal(swapped[0]?.[1]?.color, 'KIRMIZI');
  });

  it('removeMatches clears matched tiles', () => {
    const grid = buildGrid([
      ['KIRMIZI', 'KIRMIZI', 'KIRMIZI', 'MAVI', 'YESIL', 'SARI', 'MOR'],
      ['MAVI', 'YESIL', 'SARI', 'MOR', 'KIRMIZI', 'MAVI', 'YESIL'],
      ['YESIL', 'SARI', 'MOR', 'KIRMIZI', 'MAVI', 'YESIL', 'SARI'],
      ['SARI', 'MOR', 'KIRMIZI', 'MAVI', 'YESIL', 'SARI', 'MOR'],
      ['MOR', 'KIRMIZI', 'MAVI', 'YESIL', 'SARI', 'MOR', 'KIRMIZI'],
      ['KIRMIZI', 'MAVI', 'YESIL', 'SARI', 'MOR', 'KIRMIZI', 'MAVI'],
      ['MAVI', 'YESIL', 'SARI', 'MOR', 'KIRMIZI', 'MAVI', 'YESIL'],
    ]);

    const matches = findMatches(grid);
    const cleared = removeMatches(grid, matches);
    assert.equal(cleared[0]?.[0], null);
    assert.equal(cleared[0]?.[1], null);
    assert.equal(cleared[0]?.[2], null);
    assert.ok(cleared[0]?.[3]);
  });

  it('applyGravity fills from top with new tiles', () => {
    const grid = buildGrid([
      ['KIRMIZI', 'KIRMIZI', 'KIRMIZI', 'MAVI', 'YESIL', 'SARI', 'MOR'],
      ['MAVI', 'YESIL', 'SARI', 'MOR', 'KIRMIZI', 'MAVI', 'YESIL'],
      ['YESIL', 'SARI', 'MOR', 'KIRMIZI', 'MAVI', 'YESIL', 'SARI'],
      ['SARI', 'MOR', 'KIRMIZI', 'MAVI', 'YESIL', 'SARI', 'MOR'],
      ['MOR', 'KIRMIZI', 'MAVI', 'YESIL', 'SARI', 'MOR', 'KIRMIZI'],
      ['KIRMIZI', 'MAVI', 'YESIL', 'SARI', 'MOR', 'KIRMIZI', 'MAVI'],
      ['MAVI', 'YESIL', 'SARI', 'MOR', 'KIRMIZI', 'MAVI', 'YESIL'],
    ]);

    const cleared = removeMatches(grid, findMatches(grid));
    const afterGravity = applyGravity(cleared);
    assert.equal(afterGravity.length, RIFKI_GRID_SIZE);
    for (const row of afterGravity) {
      assert.equal(row.length, RIFKI_GRID_SIZE);
      for (const cell of row) {
        assert.ok(cell);
      }
    }
  });
});
