import type { Grid } from './gridHelpers';

export type TileAnimKind = 'idle' | 'match' | 'fall' | 'appear' | 'shake' | 'stoneFall';

export type TileAnimHint = {
  kind: TileAnimKind;
  fallOffsetRows?: number;
};

export type TileAnimMap = Record<string, TileAnimHint>;

export function buildMatchAnimMap(matchedIds: Iterable<string>): TileAnimMap {
  const map: TileAnimMap = {};
  for (const id of matchedIds) {
    map[id] = { kind: 'match' };
  }
  return map;
}

export function buildShakeAnimMap(tileIds: Iterable<string>): TileAnimMap {
  const map: TileAnimMap = {};
  for (const id of tileIds) {
    map[id] = { kind: 'shake' };
  }
  return map;
}

export function buildGravityAnimMap(before: Grid, after: Grid): TileAnimMap {
  const beforeIds = new Set<string>();
  const beforePos = new Map<string, { row: number; col: number }>();

  for (let row = 0; row < before.length; row++) {
    for (let col = 0; col < (before[row]?.length ?? 0); col++) {
      const cell = before[row]?.[col];
      if (!cell) continue;
      beforeIds.add(cell.id);
      beforePos.set(cell.id, { row, col });
    }
  }

  const map: TileAnimMap = {};
  for (let row = 0; row < after.length; row++) {
    for (let col = 0; col < (after[row]?.length ?? 0); col++) {
      const cell = after[row]?.[col];
      if (!cell) continue;

      if (!beforeIds.has(cell.id)) {
        map[cell.id] = { kind: 'appear' };
        continue;
      }

      const prev = beforePos.get(cell.id);
      if (!prev) continue;
      const delta = row - prev.row;
      if (delta > 0) {
        map[cell.id] = { kind: 'fall', fallOffsetRows: delta };
      }
    }
  }

  return map;
}

export function buildStoneFallAnimMap(stoneIds: Iterable<string>, flood = false): TileAnimMap {
  const map: TileAnimMap = {};
  for (const id of stoneIds) {
    map[id] = { kind: 'stoneFall', fallOffsetRows: flood ? 5 : 3 };
  }
  return map;
}

export function mergeAnimMaps(...maps: TileAnimMap[]): TileAnimMap {
  return Object.assign({}, ...maps);
}

export function collectMatchedIds(groups: { id: string }[][]): string[] {
  const ids: string[] = [];
  for (const group of groups) {
    for (const tile of group) {
      ids.push(tile.id);
    }
  }
  return ids;
}
