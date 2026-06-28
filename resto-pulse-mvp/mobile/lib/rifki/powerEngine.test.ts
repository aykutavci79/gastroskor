import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createTile, resetTileIdCounter, type Grid } from './gridHelpers';
import { continueCascade, removeMatches } from './matchEngine';
import {
  collectBlastCells,
  computePowerGrafts,
  GC_CIFT_RADIUS,
  GC_TEK_RADIUS,
  resolveMatchBlastCenters,
  uniqueBlastCells,
} from './powerEngine';

function gridWithTiles(cells: { row: number; col: number; power?: 'GC_TEK' | 'GC_CIFT' }[]): Grid {
  resetTileIdCounter();
  const grid: Grid = Array.from({ length: 7 }, () => Array.from({ length: 7 }, () => null));
  for (const cell of cells) {
    grid[cell.row]![cell.col] = createTile('KIRMIZI', cell.row, cell.col, cell.power);
  }
  return grid;
}

describe('rifki powerEngine', () => {
  it('GC_TEK blast covers 3x3 (radius 1)', () => {
    const cells = collectBlastCells(3, 3, GC_TEK_RADIUS, 7);
    assert.equal(cells.length, 9);
    assert.ok(cells.some((c) => c.row === 2 && c.col === 3));
    assert.ok(cells.some((c) => c.row === 4 && c.col === 4));
  });

  it('GC_CIFT blast covers 5x5 (radius 2)', () => {
    const cells = collectBlastCells(3, 3, GC_CIFT_RADIUS, 7);
    assert.equal(cells.length, 25);
  });

  it('4-match grafts GC_TEK, 5-match grafts GC_CIFT', () => {
    const four = [
      createTile('MAVI', 0, 0),
      createTile('MAVI', 0, 1),
      createTile('MAVI', 0, 2),
      createTile('MAVI', 0, 3),
    ];
    const five = [...four, createTile('MAVI', 0, 4)];

    assert.deepEqual(computePowerGrafts([four]), [{ row: 0, col: 2, power: 'GC_TEK', color: 'MAVI' }]);
    assert.deepEqual(computePowerGrafts([five]), [{ row: 0, col: 2, power: 'GC_CIFT', color: 'MAVI' }]);
  });

  it('single GC_CIFT in match blasts radius 2', () => {
    const tile = createTile('SARI', 2, 2, 'GC_CIFT');
    const group = [tile, createTile('SARI', 2, 1), createTile('SARI', 2, 3)];
    const centers = resolveMatchBlastCenters([group]);
    assert.equal(centers.length, 1);
    assert.equal(centers[0]?.radius, GC_CIFT_RADIUS);
    assert.equal(uniqueBlastCells(centers).length, 25);
  });

  it('two GC_TEK in same match upgrade to radius 2 each', () => {
    const tekA = createTile('YESIL', 1, 1, 'GC_TEK');
    const tekB = createTile('YESIL', 1, 2, 'GC_TEK');
    const group = [tekA, tekB, createTile('YESIL', 1, 3)];
    const centers = resolveMatchBlastCenters([group]);
    assert.equal(centers.length, 2);
    assert.ok(centers.every((c) => c.radius === GC_CIFT_RADIUS));
  });

  it('GC_TEK + GC_CIFT combo blasts both at radius 2', () => {
    const tek = createTile('MOR', 4, 4, 'GC_TEK');
    const cift = createTile('MOR', 4, 5, 'GC_CIFT');
    const group = [tek, cift, createTile('MOR', 4, 6)];
    const centers = resolveMatchBlastCenters([group]);
    assert.equal(centers.length, 2);
    assert.ok(centers.some((c) => c.row === 4 && c.col === 4 && c.radius === GC_CIFT_RADIUS));
    assert.ok(centers.some((c) => c.row === 4 && c.col === 5 && c.radius === GC_CIFT_RADIUS));
  });

  it('single GC_TEK in match does not auto-blast', () => {
    const tek = createTile('KIRMIZI', 3, 3, 'GC_TEK');
    const group = [tek, createTile('KIRMIZI', 3, 2), createTile('KIRMIZI', 3, 4)];
    assert.equal(resolveMatchBlastCenters([group]).length, 0);
  });

  it('continueCascade embeds GC graft in gravity step', () => {
    resetTileIdCounter();
    const grid: Grid = Array.from({ length: 7 }, (_, row) =>
      Array.from({ length: 7 }, (_, col) =>
        createTile(row === 0 && col <= 3 ? 'MAVI' : 'KIRMIZI', row, col),
      ),
    );
    const matches = [[grid[0]![0]!, grid[0]![1]!, grid[0]![2]!, grid[0]![3]!]];
    const prepared = removeMatches(grid, matches);
    const { steps } = continueCascade(prepared, { graftGroups: matches });
    const hasGcTek = steps[0]?.some((row) => row.some((cell) => cell?.power === 'GC_TEK'));
    assert.equal(hasGcTek, true);
  });
});
