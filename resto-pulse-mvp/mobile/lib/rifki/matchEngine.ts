import {
  RIFKI_GRID_SIZE,
  RIFKI_MAX_CASCADE_STEPS,
  cloneGrid,
  createTile,
  fillGridRandom,
  findMatchGroupsForGrid,
  gridHasInitialMatches,
  isGemTile,
  isStoneTile,
  randomTileColor,
  resetTileIdCounter,
  reshuffleGridColors,
  type Grid,
  type Tile,
} from './gridHelpers';
import { applyPowerGraftsFromGroups } from './powerGraft';
import { applyPostMatchMaterialTransfer, type MaterialContext } from './stoneEngine';

export type { Grid, Tile, TileColor, TileKind } from './gridHelpers';
export { isGemTile, isStoneTile } from './gridHelpers';

export { RIFKI_GRID_SIZE, RIFKI_MAX_CASCADE_STEPS };

function isAdjacent(r1: number, c1: number, r2: number, c2: number): boolean {
  const dr = Math.abs(r1 - r2);
  const dc = Math.abs(c1 - c2);
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
}

function scoreMatchGroup(size: number, cascadeIndex: number): number {
  let base = 100;
  if (size >= 5) base = 500;
  else if (size === 4) base = 250;
  const multiplier = Math.pow(1.25, cascadeIndex);
  return Math.round(base * multiplier);
}

export function createGrid(): Grid {
  resetTileIdCounter();
  let best = fillGridRandom(RIFKI_GRID_SIZE);

  for (let attempt = 0; attempt < 100; attempt++) {
    let grid = attempt === 0 ? cloneGrid(best) : reshuffleGridColors(cloneGrid(best));

    let reshuffles = 0;
    while (gridHasInitialMatches(grid) && reshuffles < 50) {
      grid = reshuffleGridColors(grid);
      reshuffles += 1;
    }

    if (!gridHasInitialMatches(grid) && hasAnyValidMove(grid)) {
      return grid;
    }

    if (!gridHasInitialMatches(grid)) {
      best = grid;
    }
  }

  if (hasAnyValidMove(best)) {
    return best;
  }

  return ensureValidMove(cloneGrid(best));
}

function ensureValidMove(grid: Grid): Grid {
  for (let attempt = 0; attempt < 100; attempt++) {
    const candidate = reshuffleGridColors(grid);
    if (!gridHasInitialMatches(candidate) && hasAnyValidMove(candidate)) {
      return candidate;
    }
  }
  return grid;
}

export function findMatches(grid: Grid): Tile[][] {
  return findMatchGroupsForGrid(grid);
}

export function removeMatches(grid: Grid, matches: Tile[][]): Grid {
  const matchedIds = new Set<string>();
  for (const group of matches) {
    for (const tile of group) {
      matchedIds.add(tile.id);
    }
  }

  return grid.map((row) =>
    row.map((cell) => {
      if (cell && matchedIds.has(cell.id)) {
        return null;
      }
      return cell ? { ...cell } : null;
    }),
  );
}

export function applyGravity(grid: Grid): Grid {
  const size = grid.length;
  const next: Grid = Array.from({ length: size }, () => Array.from({ length: size }, () => null));

  for (let col = 0; col < size; col++) {
    const existing: Tile[] = [];
    for (let row = size - 1; row >= 0; row--) {
      const cell = grid[row]?.[col];
      if (cell) existing.push(cell);
    }

    let writeRow = size - 1;
    for (const tile of existing) {
      next[writeRow]![col] = {
        ...tile,
        row: writeRow,
        col,
        isMatched: false,
        isFalling: false,
        isObstacle: false,
      };
      writeRow -= 1;
    }

    for (let row = writeRow; row >= 0; row--) {
      next[row]![col] = createTile(randomTileColor(), row, col);
    }
  }

  return next;
}

export type BoardCascade = {
  groups: Tile[][];
  score: number;
};

function runCascadeLoop(
  initial: Grid,
  steps: Grid[],
  cascades: BoardCascade[],
  startIndex: number,
  stoneContext?: MaterialContext,
): { totalScore: number; endIndex: number } {
  let working = cloneGrid(initial);
  let totalScore = 0;
  let cascadeIndex = startIndex;

  for (let step = 0; step < RIFKI_MAX_CASCADE_STEPS; step++) {
    const matches = findMatches(working);
    if (!matches.length) break;

    let cascadeScore = 0;
    for (const group of matches) {
      cascadeScore += scoreMatchGroup(group.length, cascadeIndex);
    }
    totalScore += cascadeScore;
    cascades.push({ groups: matches, score: cascadeScore });
    cascadeIndex += 1;

    working = removeMatches(working, matches);

    if (stoneContext) {
      const physics = applyPostMatchMaterialTransfer(working, matches, stoneContext.volume);
      working = physics.grid;
      stoneContext.volume = physics.materialVolume;
    } else {
      working = applyGravity(working);
    }

    working = applyPowerGraftsFromGroups(working, matches);
    steps.push(cloneGrid(working));
  }

  return { totalScore, endIndex: cascadeIndex };
}

export function processBoard(grid: Grid): {
  steps: Grid[];
  totalScore: number;
  cascades: BoardCascade[];
} {
  const steps: Grid[] = [];
  const cascades: BoardCascade[] = [];
  const { totalScore } = runCascadeLoop(grid, steps, cascades, 0);
  return { steps, totalScore, cascades };
}

/** Grid'de boşluk varsa taş+gem fiziği veya yerçekimi, sonra cascade. */
export function continueCascade(
  grid: Grid,
  options?: { graftGroups?: Tile[][]; stoneContext?: MaterialContext; skipInitialGravity?: boolean },
): {
  steps: Grid[];
  totalScore: number;
  cascades: BoardCascade[];
} {
  let working = cloneGrid(grid);
  const steps: Grid[] = [];
  const cascades: BoardCascade[] = [];

  if (!options?.skipInitialGravity) {
    if (options?.stoneContext) {
      const physics = applyPostMatchMaterialTransfer(
        working,
        options.graftGroups ?? [],
        options.stoneContext.volume,
      );
      working = physics.grid;
      options.stoneContext.volume = physics.materialVolume;
    } else {
      working = applyGravity(working);
    }
    if (options?.graftGroups?.length) {
      working = applyPowerGraftsFromGroups(working, options.graftGroups);
    }
    steps.push(cloneGrid(working));
  }

  const { totalScore } = runCascadeLoop(working, steps, cascades, 0, options?.stoneContext);
  return { steps, totalScore, cascades };
}

export function shuffleGridWithValidMoves(grid: Grid): Grid {
  for (let attempt = 0; attempt < 100; attempt++) {
    const candidate = reshuffleGridColors(cloneGrid(grid));
    if (!gridHasInitialMatches(candidate) && hasAnyValidMove(candidate)) {
      return candidate;
    }
  }
  return createGrid();
}

export function swapTiles(grid: Grid, r1: number, c1: number, r2: number, c2: number): Grid {
  const next = cloneGrid(grid);
  const a = next[r1]?.[c1] ?? null;
  const b = next[r2]?.[c2] ?? null;
  if (!a || !b || isStoneTile(a) || isStoneTile(b)) return next;

  next[r1]![c1] = { ...b, row: r1, col: c1 };
  next[r2]![c2] = { ...a, row: r2, col: c2 };
  return next;
}

export function isValidSwap(grid: Grid, r1: number, c1: number, r2: number, c2: number): boolean {
  if (!isAdjacent(r1, c1, r2, c2)) return false;
  const a = grid[r1]?.[c1];
  const b = grid[r2]?.[c2];
  if (!isGemTile(a) || !isGemTile(b)) return false;

  const swapped = swapTiles(grid, r1, c1, r2, c2);
  return findMatches(swapped).length > 0;
}

export function hasAnyValidMove(grid: Grid): boolean {
  const size = grid.length;
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (!isGemTile(grid[row]?.[col])) continue;
      if (col + 1 < size && isValidSwap(grid, row, col, row, col + 1)) return true;
      if (row + 1 < size && isValidSwap(grid, row, col, row + 1, col)) return true;
    }
  }
  return false;
}
