import {
  RIFKI_GRID_SIZE,
  RIFKI_MAX_CASCADE_STEPS,
  cloneGrid,
  type GcPower,
  type Grid,
  type Tile,
} from './gridHelpers';
import { applyGravity, findMatches, removeMatches } from './matchEngine';

export type BlastCenter = {
  row: number;
  col: number;
  radius: number;
};

export const GC_TEK_RADIUS = 1;
export const GC_CIFT_RADIUS = 2;

export function gcPowerRadius(power: GcPower): number {
  return power === 'GC_CIFT' ? GC_CIFT_RADIUS : GC_TEK_RADIUS;
}

export function collectBlastCells(
  row: number,
  col: number,
  radius: number,
  size: number = RIFKI_GRID_SIZE,
): { row: number; col: number }[] {
  const cells: { row: number; col: number }[] = [];
  for (let r = row - radius; r <= row + radius; r++) {
    for (let c = col - radius; c <= col + radius; c++) {
      if (r < 0 || c < 0 || r >= size || c >= size) continue;
      cells.push({ row: r, col: c });
    }
  }
  return cells;
}

export function clearCells(grid: Grid, positions: { row: number; col: number }[]): Grid {
  const keys = new Set(positions.map(({ row, col }) => `${row},${col}`));
  return grid.map((row, rowIndex) =>
    row.map((cell, colIndex) => {
      if (keys.has(`${rowIndex},${colIndex}`)) return null;
      return cell ? { ...cell } : null;
    }),
  );
}

export function uniqueBlastCells(centers: BlastCenter[], size: number = RIFKI_GRID_SIZE): { row: number; col: number }[] {
  const seen = new Set<string>();
  const out: { row: number; col: number }[] = [];
  for (const center of centers) {
    for (const cell of collectBlastCells(center.row, center.col, center.radius, size)) {
      const key = `${cell.row},${cell.col}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(cell);
    }
  }
  return out;
}

export function tilesAtPositions(grid: Grid, positions: { row: number; col: number }[]): Tile[] {
  const tiles: Tile[] = [];
  for (const { row, col } of positions) {
    const tile = grid[row]?.[col];
    if (tile) tiles.push(tile);
  }
  return tiles;
}

export function resolveMatchBlastCenters(groups: Tile[][]): BlastCenter[] {
  const centers: BlastCenter[] = [];

  for (const group of groups) {
    const powers = group.filter((tile) => tile.power);
    if (!powers.length) continue;

    const hasCift = powers.some((tile) => tile.power === 'GC_CIFT');
    const hasTek = powers.some((tile) => tile.power === 'GC_TEK');

    if (hasCift) {
      for (const tile of powers) {
        if (tile.power === 'GC_CIFT') {
          centers.push({ row: tile.row, col: tile.col, radius: GC_CIFT_RADIUS });
        }
      }
    }

    if (hasCift && hasTek) {
      for (const tile of powers) {
        if (tile.power === 'GC_TEK') {
          centers.push({ row: tile.row, col: tile.col, radius: GC_CIFT_RADIUS });
        }
      }
    } else if (powers.length >= 2 && powers.every((tile) => tile.power === 'GC_TEK')) {
      for (const tile of powers) {
        centers.push({ row: tile.row, col: tile.col, radius: GC_CIFT_RADIUS });
      }
    }
  }

  return centers;
}

export {
  applyPowerGrafts,
  applyPowerGraftsFromGroups,
  computePowerGrafts,
  graftPowerTile,
  type PowerGraft,
} from './powerGraft';

export function mergeBlastIntoBoard(grid: Grid, centers: BlastCenter[]): Grid {
  if (!centers.length) return grid;
  return clearCells(grid, uniqueBlastCells(centers));
}

export function processBlastBoard(
  grid: Grid,
  centers: BlastCenter[],
): { steps: Grid[]; totalScore: number; cascades: { groups: Tile[][]; score: number }[]; blastCount: number } {
  const blastCells = uniqueBlastCells(centers);
  const blastCount = tilesAtPositions(grid, blastCells).length;
  let totalScore = blastCount * 120;

  let prepared = mergeBlastIntoBoard(grid, centers);
  const steps: Grid[] = [cloneGrid(prepared)];

  let working = applyGravity(prepared);
  steps.push(cloneGrid(working));

  const cascades: { groups: Tile[][]; score: number }[] = [];
  let cascadeIndex = 0;

  for (let step = 0; step < RIFKI_MAX_CASCADE_STEPS; step++) {
    const matches = findMatches(working);
    if (!matches.length) break;

    let cascadeScore = 0;
    for (const group of matches) {
      let base = 100;
      if (group.length >= 5) base = 500;
      else if (group.length === 4) base = 250;
      cascadeScore += Math.round(base * Math.pow(1.25, cascadeIndex));
    }
    totalScore += cascadeScore;
    cascades.push({ groups: matches, score: cascadeScore });
    cascadeIndex += 1;

    working = removeMatches(working, matches);
    steps.push(cloneGrid(working));
    working = applyGravity(working);
    steps.push(cloneGrid(working));
  }

  return { steps, totalScore, cascades, blastCount };
}
