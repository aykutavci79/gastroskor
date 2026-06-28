import {
  mergeBlastIntoBoard,
  resolveMatchBlastCenters,
  tilesAtPositions,
  uniqueBlastCells,
  type BlastCenter,
} from './powerEngine';
import { cloneGrid, type Grid, type Tile } from './gridHelpers';
import { continueCascade, findMatches, removeMatches, type BoardCascade } from './matchEngine';
import { applyPowerGraftsFromGroups } from './powerGraft';
import {
  applyBlastMaterialTransfer,
  applyPostMatchMaterialTransfer,
  type MaterialContext,
} from './stoneEngine';

function scoreMatchGroup(size: number, cascadeIndex: number): number {
  let base = 100;
  if (size >= 5) base = 500;
  else if (size === 4) base = 250;
  return Math.round(base * Math.pow(1.25, cascadeIndex));
}

export function scoreBlastTiles(count: number): number {
  return count * 120;
}

export function resolveSwapWithPowers(
  swapped: Grid,
  materialVolume: number,
): {
  prepared: Grid;
  steps: Grid[];
  totalScore: number;
  cascades: BoardCascade[];
  initialMatches: Tile[][];
  materialVolume: number;
  materialTransferred: number;
  isFlood: boolean;
} {
  const initialMatches = findMatches(swapped);
  const blastCenters = resolveMatchBlastCenters(initialMatches);
  const blastCells = blastCenters.length ? uniqueBlastCells(blastCenters) : [];
  const blastCols = [...new Set(blastCells.map((cell) => cell.col))];

  let totalScore = 0;
  for (const group of initialMatches) {
    totalScore += scoreMatchGroup(group.length, 0);
  }

  if (blastCenters.length) {
    totalScore += scoreBlastTiles(tilesAtPositions(swapped, blastCells).length);
  }

  const prepared = mergeBlastIntoBoard(removeMatches(swapped, initialMatches), blastCenters);

  const materialContext: MaterialContext = { volume: materialVolume };
  const physics = applyPostMatchMaterialTransfer(prepared, initialMatches, materialContext.volume, blastCols);
  let working = applyPowerGraftsFromGroups(physics.grid, initialMatches);
  materialContext.volume = physics.materialVolume;

  const steps: Grid[] = [cloneGrid(working)];
  const cascades: BoardCascade[] = [];
  if (initialMatches.length) {
    cascades.push({
      groups: initialMatches,
      score: initialMatches.reduce((sum, group) => sum + scoreMatchGroup(group.length, 0), 0),
    });
  }

  const continued = continueCascade(working, { stoneContext: materialContext, skipInitialGravity: true });
  steps.push(...continued.steps);
  cascades.push(...continued.cascades);
  totalScore += continued.totalScore;

  return {
    prepared,
    steps,
    totalScore,
    cascades,
    initialMatches,
    materialVolume: materialContext.volume,
    materialTransferred: physics.transferred,
    isFlood: physics.isFlood,
  };
}

export function resolveGcTekBlast(
  grid: Grid,
  row: number,
  col: number,
  materialVolume: number,
): {
  prepared: Grid;
  steps: Grid[];
  totalScore: number;
  cascades: BoardCascade[];
  blastCenters: BlastCenter[];
  materialVolume: number;
  materialTransferred: number;
  isFlood: boolean;
} {
  const centers = [{ row, col, radius: 1 }];
  const blastCells = uniqueBlastCells(centers);
  const blastCols = [...new Set(blastCells.map((cell) => cell.col))];
  let totalScore = scoreBlastTiles(tilesAtPositions(grid, blastCells).length);

  const holeGrid = mergeBlastIntoBoard(grid, centers);
  const materialContext: MaterialContext = { volume: materialVolume };
  const physics = applyBlastMaterialTransfer(holeGrid, blastCols, materialContext.volume, blastCells.length);
  const working = physics.grid;
  materialContext.volume = physics.materialVolume;

  const steps: Grid[] = [cloneGrid(working)];
  const continued = continueCascade(working, { stoneContext: materialContext, skipInitialGravity: true });
  steps.push(...continued.steps);
  totalScore += continued.totalScore;

  return {
    prepared: holeGrid,
    steps,
    totalScore,
    cascades: continued.cascades,
    blastCenters: centers,
    materialVolume: materialContext.volume,
    materialTransferred: physics.transferred,
    isFlood: physics.isFlood,
  };
}
