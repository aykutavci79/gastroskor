import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createTile, resetTileIdCounter, type Grid } from './gridHelpers';
import { removeMatches } from './matchEngine';
import {
  applyPostMatchMaterialTransfer,
  arenaVisibleStoneCount,
  clampMaterialVolume,
  computeTransferBudget,
  countGemMatchCells,
  dropStonesFromTunnel,
  dropStonesIntoPositions,
  isMaterialRelief,
  MATERIAL_VOLUME_MAX,
} from './stoneEngine';

describe('rifki stoneEngine', () => {
  it('transfers material from tunnel volume into cleared match cells', () => {
    resetTileIdCounter();
    const grid: Grid = Array.from({ length: 7 }, (_, row) =>
      Array.from({ length: 7 }, (_, col) => createTile('MAVI', row, col)),
    );
    const matches = [[grid[3]![0]!, grid[3]![1]!, grid[3]![2]!]];
    const cleared = removeMatches(grid, matches);

    const { grid: next, materialVolume, transferred } = applyPostMatchMaterialTransfer(cleared, matches, 10);
    assert.equal(transferred, 3);
    assert.equal(materialVolume, 7);
    assert.ok(next.some((row) => row.some((cell) => cell?.kind === 'stone')));
  });

  it('5-match requests flood budget multiplier', () => {
    resetTileIdCounter();
    const tiles = Array.from({ length: 5 }, (_, i) => createTile('MAVI', 2, i));
    const { budget, isFlood } = computeTransferBudget([tiles], 20);
    assert.equal(budget, 9);
    assert.equal(isFlood, true);
  });

  it('drops stones into exact cleared positions first', () => {
    resetTileIdCounter();
    const grid: Grid = Array.from({ length: 7 }, () => Array.from({ length: 7 }, () => null));
    const positions = [
      { row: 4, col: 1 },
      { row: 4, col: 2 },
    ];
    const { grid: withStone, dropped } = dropStonesIntoPositions(grid, positions, 2);
    assert.equal(dropped, 2);
    assert.equal(withStone[4]?.[1]?.kind, 'stone');
    assert.equal(withStone[4]?.[2]?.kind, 'stone');
  });

  it('arena stone count tracks material volume', () => {
    assert.equal(arenaVisibleStoneCount(0), 0);
    assert.ok(arenaVisibleStoneCount(MATERIAL_VOLUME_MAX) >= 40);
  });

  it('isMaterialRelief when volume low', () => {
    assert.equal(isMaterialRelief(5), true);
    assert.equal(isMaterialRelief(20), false);
  });

  it('clampMaterialVolume respects max', () => {
    assert.equal(clampMaterialVolume(MATERIAL_VOLUME_MAX + 10), MATERIAL_VOLUME_MAX);
    assert.equal(countGemMatchCells([[createTile('SARI', 0, 0)]]), 1);
  });

  it('stones fill lowest empty cell in column as fallback', () => {
    resetTileIdCounter();
    const grid: Grid = Array.from({ length: 7 }, () => Array.from({ length: 7 }, () => null));
    grid[6]![2] = createTile('YESIL', 6, 2);
    const { dropped } = dropStonesFromTunnel(grid, [2], 1);
    assert.equal(dropped, 1);
  });
});
