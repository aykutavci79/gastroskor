import { cloneGrid, type GcPower, type Grid, type Tile } from './gridHelpers';

export type PowerGraft = { row: number; col: number; power: GcPower; color: Tile['color'] };

export function computePowerGrafts(groups: Tile[][]): PowerGraft[] {
  const grafts: PowerGraft[] = [];
  for (const group of groups) {
    const anchor = group[Math.floor(group.length / 2)];
    if (!anchor) continue;
    if (group.length >= 5) {
      grafts.push({ row: anchor.row, col: anchor.col, power: 'GC_CIFT', color: anchor.color });
    } else if (group.length === 4) {
      grafts.push({ row: anchor.row, col: anchor.col, power: 'GC_TEK', color: anchor.color });
    }
  }
  return grafts;
}

export function graftPowerTile(
  grid: Grid,
  row: number,
  col: number,
  power: GcPower,
  color?: Tile['color'],
): Grid {
  const cell = grid[row]?.[col];
  if (!cell) return grid;
  const next = cloneGrid(grid);
  next[row]![col] = { ...cell, power, color: color ?? cell.color };
  return next;
}

export function applyPowerGrafts(grid: Grid, grafts: PowerGraft[]): Grid {
  let next = grid;
  for (const graft of grafts) {
    next = graftPowerTile(next, graft.row, graft.col, graft.power, graft.color);
  }
  return next;
}

export function applyPowerGraftsFromGroups(grid: Grid, groups: Tile[][]): Grid {
  return applyPowerGrafts(grid, computePowerGrafts(groups));
}
