export type TileColor = 'KIRMIZI' | 'MAVI' | 'YESIL' | 'SARI' | 'MOR';

export type GcPower = 'GC_TEK' | 'GC_CIFT';

export type TileKind = 'gem' | 'stone';

export type Tile = {
  id: string;
  color: TileColor;
  row: number;
  col: number;
  isMatched: boolean;
  isFalling: boolean;
  isObstacle: boolean;
  kind?: TileKind;
  power?: GcPower;
};

export type Grid = (Tile | null)[][];

export const RIFKI_GRID_SIZE = 7;
export const RIFKI_MAX_CASCADE_STEPS = 20;
export const RIFKI_TILE_COLORS: TileColor[] = ['KIRMIZI', 'MAVI', 'YESIL', 'SARI', 'MOR'];

let tileIdCounter = 0;

export function resetTileIdCounter(): void {
  tileIdCounter = 0;
}

export function isStoneTile(tile: Tile | null | undefined): boolean {
  return tile != null && (tile.kind === 'stone' || tile.isObstacle);
}

export function isGemTile(tile: Tile | null | undefined): boolean {
  return tile != null && !isStoneTile(tile);
}

export function createTile(color: TileColor, row: number, col: number, power?: GcPower): Tile {
  tileIdCounter += 1;
  return {
    id: `rifki-tile-${tileIdCounter}`,
    color,
    row,
    col,
    isMatched: false,
    isFalling: false,
    isObstacle: false,
    kind: 'gem',
    ...(power ? { power } : {}),
  };
}

export function createStoneTile(row: number, col: number): Tile {
  tileIdCounter += 1;
  return {
    id: `rifki-stone-${tileIdCounter}`,
    color: 'KIRMIZI',
    row,
    col,
    isMatched: false,
    isFalling: false,
    isObstacle: true,
    kind: 'stone',
  };
}

export function randomTileColor(): TileColor {
  const idx = Math.floor(Math.random() * RIFKI_TILE_COLORS.length);
  return RIFKI_TILE_COLORS[idx] ?? 'KIRMIZI';
}

export function cloneGrid(grid: Grid): Grid {
  return grid.map((row) =>
    row.map((cell) =>
      cell
        ? {
            ...cell,
          }
        : null,
    ),
  );
}

export function gridHasInitialMatches(grid: Grid): boolean {
  return findMatchGroupsForGrid(grid).length > 0;
}

/** Internal scan — exported for tests via matchEngine.findMatches */
function findMatchGroupsForGrid(grid: Grid): Tile[][] {
  const groups: Tile[][] = [];
  const size = grid.length;

  for (let row = 0; row < size; row++) {
    let col = 0;
    while (col < size) {
      const start = grid[row]?.[col];
      if (!start || isStoneTile(start)) {
        col += 1;
        continue;
      }
      let end = col + 1;
      while (end < size && grid[row]?.[end]?.color === start.color && isGemTile(grid[row]?.[end])) {
        end += 1;
      }
      const run = end - col;
      if (run >= 3) {
        const group: Tile[] = [];
        for (let c = col; c < end; c++) {
          const tile = grid[row]?.[c];
          if (tile) group.push(tile);
        }
        groups.push(group);
      }
      col = end;
    }
  }

  for (let col = 0; col < size; col++) {
    let row = 0;
    while (row < size) {
      const start = grid[row]?.[col];
      if (!start || isStoneTile(start)) {
        row += 1;
        continue;
      }
      let end = row + 1;
      while (end < size && grid[end]?.[col]?.color === start.color && isGemTile(grid[end]?.[col])) {
        end += 1;
      }
      const run = end - row;
      if (run >= 3) {
        const group: Tile[] = [];
        for (let r = row; r < end; r++) {
          const tile = grid[r]?.[col];
          if (tile) group.push(tile);
        }
        groups.push(group);
      }
      row = end;
    }
  }

  return groups;
}

export function fillGridRandom(size: number = RIFKI_GRID_SIZE): Grid {
  const grid: Grid = [];
  for (let row = 0; row < size; row++) {
    const rowCells: Grid[number] = [];
    for (let col = 0; col < size; col++) {
      rowCells.push(createTile(randomTileColor(), row, col));
    }
    grid.push(rowCells);
  }
  return grid;
}

export function reshuffleGridColors(grid: Grid): Grid {
  const colors: TileColor[] = [];
  for (const row of grid) {
    for (const cell of row) {
      if (cell) colors.push(cell.color);
    }
  }
  for (let i = colors.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [colors[i], colors[j]] = [colors[j]!, colors[i]!];
  }
  let idx = 0;
  return grid.map((row, rowIndex) =>
    row.map((cell, colIndex) => {
      if (!cell) return null;
      const color = colors[idx] ?? randomTileColor();
      idx += 1;
      return { ...cell, color, row: rowIndex, col: colIndex, isMatched: false, isFalling: false, power: cell.power };
    }),
  );
}

export { findMatchGroupsForGrid };
