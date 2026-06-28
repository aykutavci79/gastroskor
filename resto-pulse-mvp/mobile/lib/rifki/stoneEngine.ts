import {
  cloneGrid,
  createStoneTile,
  createTile,
  isStoneTile,
  randomTileColor,
  type Grid,
  type Tile,
} from './gridHelpers';

export const MATERIAL_VOLUME_MAX = 42;
/** @deprecated use MATERIAL_VOLUME_MAX */
export const TUNNEL_STONE_MAX = MATERIAL_VOLUME_MAX;
export const ENEMY_MOVE_MATERIAL_GAIN = 5;
export const MATERIAL_RELIEF_THRESHOLD = 8;

export type MaterialContext = {
  volume: number;
};

/** @deprecated use MaterialContext */
export type StoneContext = MaterialContext;

export function createMaterialContext(volume = 0): MaterialContext {
  return { volume: clampMaterialVolume(volume) };
}

export function clampMaterialVolume(value: number): number {
  return Math.max(0, Math.min(MATERIAL_VOLUME_MAX, value));
}

/** @deprecated */
export function clampTunnelReserve(value: number): number {
  return clampMaterialVolume(value);
}

export function materialPressureRatio(volume: number): number {
  return clampMaterialVolume(volume) / MATERIAL_VOLUME_MAX;
}

export function enemySpawnMaterialVolume(enemyPosition: number): number {
  return clampMaterialVolume(Math.round(((7 - enemyPosition) / 7) * MATERIAL_VOLUME_MAX * 0.55));
}

/** @deprecated */
export function enemyPressureReserve(enemyPosition: number): number {
  return enemySpawnMaterialVolume(enemyPosition);
}

export function isMaterialRelief(volume: number): boolean {
  return volume <= MATERIAL_RELIEF_THRESHOLD;
}

export function getMatchColumns(groups: Tile[][]): number[] {
  const cols = new Set<number>();
  for (const group of groups) {
    for (const tile of group) {
      cols.add(tile.col);
    }
  }
  return [...cols];
}

export function mergeColumns(matchCols: number[], blastCols: number[]): number[] {
  const cols = new Set(matchCols);
  for (const col of blastCols) cols.add(col);
  return [...cols];
}

export function countGemMatchCells(groups: Tile[][]): number {
  let count = 0;
  for (const group of groups) {
    for (const tile of group) {
      if (!isStoneTile(tile)) count += 1;
    }
  }
  return count;
}

export function getMatchCellPositions(groups: Tile[][]): { row: number; col: number }[] {
  const positions: { row: number; col: number }[] = [];
  for (const group of groups) {
    for (const tile of group) {
      if (!isStoneTile(tile)) positions.push({ row: tile.row, col: tile.col });
    }
  }
  return positions;
}

export function computeTransferBudget(groups: Tile[][], materialVolume: number): {
  budget: number;
  isFlood: boolean;
} {
  const cells = countGemMatchCells(groups);
  const maxGroup = groups.reduce((max, group) => Math.max(max, group.length), 0);
  let multiplier = 1;
  let isFlood = false;

  if (maxGroup >= 5) {
    multiplier = 1.75;
    isFlood = true;
  } else if (maxGroup >= 4) {
    multiplier = 1.35;
  }

  const requested = Math.ceil(cells * multiplier);
  const budget = Math.min(requested, clampMaterialVolume(materialVolume));
  if (requested >= 6) isFlood = true;

  return { budget, isFlood };
}

export function clearStonesInColumns(grid: Grid, columns: number[]): Grid {
  if (!columns.length) return grid;
  const colSet = new Set(columns);
  return grid.map((row) =>
    row.map((cell) => {
      if (cell && isStoneTile(cell) && colSet.has(cell.col)) return null;
      return cell ? { ...cell } : null;
    }),
  );
}

/** Taşları önce eşleşmenin açtığı boş hücrelere yerleştir (RK: malzeme oraya akar). */
export function dropStonesIntoPositions(
  grid: Grid,
  positions: { row: number; col: number }[],
  budget: number,
): { grid: Grid; dropped: number; newStoneIds: string[] } {
  if (budget <= 0 || !positions.length) {
    return { grid, dropped: 0, newStoneIds: [] };
  }

  let remaining = budget;
  const newStoneIds: string[] = [];
  const next = cloneGrid(grid);
  const sorted = [...positions].sort((a, b) => b.row - a.row || a.col - b.col);

  for (const pos of sorted) {
    if (remaining <= 0) break;
    if (next[pos.row]?.[pos.col]) continue;
    const stone = createStoneTile(pos.row, pos.col);
    next[pos.row]![pos.col] = stone;
    newStoneIds.push(stone.id);
    remaining -= 1;
  }

  return { grid: next, dropped: budget - remaining, newStoneIds };
}

export function dropStonesFromTunnel(
  grid: Grid,
  columns: number[],
  budget: number,
): { grid: Grid; dropped: number; newStoneIds: string[] } {
  if (budget <= 0 || !columns.length) {
    return { grid, dropped: 0, newStoneIds: [] };
  }

  let remaining = budget;
  const newStoneIds: string[] = [];
  const next = cloneGrid(grid);
  const size = grid.length;
  const sortedCols = [...columns].sort((a, b) => a - b);

  let progress = true;
  while (remaining > 0 && progress) {
    progress = false;
    for (const col of sortedCols) {
      if (remaining <= 0) break;
      for (let row = size - 1; row >= 0; row--) {
        if (next[row]?.[col]) continue;
        const stone = createStoneTile(row, col);
        next[row]![col] = stone;
        newStoneIds.push(stone.id);
        remaining -= 1;
        progress = true;
        break;
      }
    }
  }

  return { grid: next, dropped: budget - remaining, newStoneIds };
}

export function packColumnGravity(grid: Grid): Grid {
  const size = grid.length;
  const next: Grid = Array.from({ length: size }, () => Array.from({ length: size }, () => null));

  for (let col = 0; col < size; col++) {
    const stack: Tile[] = [];
    for (let row = 0; row < size; row++) {
      const cell = grid[row]?.[col];
      if (cell) stack.push(cell);
    }

    let writeRow = size - 1;
    for (let i = stack.length - 1; i >= 0; i--) {
      const tile = stack[i]!;
      next[writeRow]![col] = {
        ...tile,
        row: writeRow,
        col,
        isMatched: false,
        isFalling: false,
      };
      writeRow -= 1;
    }

    for (let row = writeRow; row >= 0; row--) {
      next[row]![col] = createTile(randomTileColor(), row, col);
    }
  }

  return next;
}

export type MaterialTransferResult = {
  grid: Grid;
  materialVolume: number;
  newStoneIds: string[];
  transferred: number;
  isFlood: boolean;
};

export function applyPostMatchMaterialTransfer(
  grid: Grid,
  matches: Tile[][],
  materialVolume: number,
  extraColumns: number[] = [],
): MaterialTransferResult {
  const columns = mergeColumns(getMatchColumns(matches), extraColumns);
  const clearedPositions = getMatchCellPositions(matches);
  const { budget, isFlood } = computeTransferBudget(matches, materialVolume);

  let working = clearStonesInColumns(grid, columns);

  const primary = dropStonesIntoPositions(working, clearedPositions, budget);
  working = primary.grid;
  let transferred = primary.dropped;
  const newStoneIds = [...primary.newStoneIds];

  const leftover = budget - transferred;
  if (leftover > 0) {
    const secondary = dropStonesFromTunnel(working, columns, leftover);
    working = secondary.grid;
    transferred += secondary.dropped;
    newStoneIds.push(...secondary.newStoneIds);
  }

  working = packColumnGravity(working);

  return {
    grid: working,
    materialVolume: clampMaterialVolume(materialVolume - transferred),
    newStoneIds,
    transferred,
    isFlood: isFlood || transferred >= 5,
  };
}

/** @deprecated use applyPostMatchMaterialTransfer */
export function applyPostMatchPhysics(
  grid: Grid,
  matches: Tile[][],
  materialVolume: number,
  extraColumns: number[] = [],
): { grid: Grid; tunnelReserve: number; newStoneIds: string[] } {
  const result = applyPostMatchMaterialTransfer(grid, matches, materialVolume, extraColumns);
  return {
    grid: result.grid,
    tunnelReserve: result.materialVolume,
    newStoneIds: result.newStoneIds,
  };
}

export function applyBlastMaterialTransfer(
  grid: Grid,
  blastColumns: number[],
  materialVolume: number,
  blastCellCount: number,
): MaterialTransferResult {
  const budget = Math.min(
    Math.max(2, Math.ceil(blastCellCount * 0.65)),
    clampMaterialVolume(materialVolume),
  );
  let working = clearStonesInColumns(grid, blastColumns);
  const { grid: withStones, dropped, newStoneIds } = dropStonesFromTunnel(working, blastColumns, budget);
  working = packColumnGravity(withStones);

  return {
    grid: working,
    materialVolume: clampMaterialVolume(materialVolume - dropped),
    newStoneIds,
    transferred: dropped,
    isFlood: dropped >= 5,
  };
}

/** @deprecated */
export function applyBlastStonePhysics(
  grid: Grid,
  blastColumns: number[],
  materialVolume: number,
  blastCellCount: number,
): { grid: Grid; tunnelReserve: number; newStoneIds: string[] } {
  const result = applyBlastMaterialTransfer(grid, blastColumns, materialVolume, blastCellCount);
  return {
    grid: result.grid,
    tunnelReserve: result.materialVolume,
    newStoneIds: result.newStoneIds,
  };
}

export function collectGridTileIds(grid: Grid): Set<string> {
  const ids = new Set<string>();
  for (const row of grid) {
    for (const cell of row) {
      if (cell) ids.add(cell.id);
    }
  }
  return ids;
}

export function findNewStoneIds(before: Grid, after: Grid): string[] {
  const beforeIds = collectGridTileIds(before);
  const ids: string[] = [];
  for (const row of after) {
    for (const cell of row) {
      if (cell && isStoneTile(cell) && !beforeIds.has(cell.id)) {
        ids.push(cell.id);
      }
    }
  }
  return ids;
}

export function arenaVisibleStoneCount(materialVolume: number): number {
  if (materialVolume <= 0) return 0;
  const ratio = materialVolume / MATERIAL_VOLUME_MAX;
  return Math.max(3, Math.round(ratio * 48));
}
