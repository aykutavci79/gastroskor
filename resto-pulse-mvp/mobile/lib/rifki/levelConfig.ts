import type { TileColor } from './gridHelpers';
import { getFirstSpawnDelay, getMoveIntervalMs, getRespawnDelay } from './enemyEngine';

export type LevelConfig = {
  id: number;
  name: string;
  maxMoves: number;
  targetScore: number;
  targetMatches?: { color: TileColor; count: number }[];
  enemyConfig: {
    firstSpawnDelayMs: number;
    moveIntervalMs: number;
    respawnDelayMs: number;
  };
};

const LEVEL_NAMES: Record<number, string> = {
  1: 'Vale Odası',
  2: 'Servis Koridoru',
  3: 'Mutfak Kapısı',
  4: 'Soğuk Hava Deposu',
  5: 'Garson Kulübesi',
  6: 'Ana Salon',
  7: 'Bar Tezgâhı',
  8: 'Teras Köşesi',
  9: 'VIP Bölüm',
  10: 'Açık Büfe',
  11: 'Fırın Yanı',
  12: 'Bulaşıkhane',
  13: 'Kiler Girişi',
  14: 'Asansör Önü',
  15: 'Arka Bahçe',
  16: 'Gece Vardiyası',
  17: 'Kalabalık Cuma',
  18: 'Düğün Salonu',
  19: 'Şef Masası',
  20: 'Son Kapı',
};

const EASY_COLORS: TileColor[] = ['KIRMIZI', 'MAVI', 'YESIL', 'SARI', 'MOR'];

function lerp(min: number, max: number, step: number, total: number): number {
  if (total <= 1) return min;
  return Math.round(min + ((max - min) * step) / (total - 1));
}

function buildFixedLevel(id: number): LevelConfig {
  const tier =
    id <= 5 ? 'easy' : id <= 10 ? 'medium' : id <= 15 ? 'hard' : 'extreme';
  const step = (id - 1) % 5;

  let maxMoves = 38;
  let targetScore = 1500;
  let targetMatches: LevelConfig['targetMatches'];
  let respawnDelayMs = 20000;

  if (tier === 'easy') {
    maxMoves = lerp(40, 35, step, 5);
    targetScore = lerp(1000, 2000, step, 5);
    respawnDelayMs = 20000;
  } else if (tier === 'medium') {
    maxMoves = lerp(30, 25, step, 5);
    targetScore = lerp(3000, 5000, step, 5);
    targetMatches = [{ color: EASY_COLORS[step % EASY_COLORS.length]!, count: lerp(15, 20, step, 5) }];
    respawnDelayMs = 15000;
  } else if (tier === 'hard') {
    maxMoves = lerp(25, 20, step, 5);
    targetScore = lerp(6000, 9000, step, 5);
    targetMatches = [
      { color: EASY_COLORS[step % EASY_COLORS.length]!, count: lerp(15, 20, step, 5) },
      { color: EASY_COLORS[(step + 2) % EASY_COLORS.length]!, count: lerp(15, 20, step, 5) },
    ];
    respawnDelayMs = 12000;
  } else {
    maxMoves = lerp(20, 15, step, 5);
    targetScore = lerp(10000, 15000, step, 5);
    targetMatches = [
      { color: EASY_COLORS[step % EASY_COLORS.length]!, count: lerp(20, 25, step, 5) },
      { color: EASY_COLORS[(step + 1) % EASY_COLORS.length]!, count: lerp(20, 25, step, 5) },
    ];
    respawnDelayMs = 10000;
  }

  return {
    id,
    name: LEVEL_NAMES[id] ?? `Level ${id}`,
    maxMoves,
    targetScore,
    targetMatches,
    enemyConfig: {
      firstSpawnDelayMs: getFirstSpawnDelay(id),
      moveIntervalMs: getMoveIntervalMs(id),
      respawnDelayMs,
    },
  };
}

export const RIFKI_LEVELS: LevelConfig[] = Array.from({ length: 20 }, (_, index) =>
  buildFixedLevel(index + 1),
);

export function getLevelConfig(levelNumber: number): LevelConfig {
  if (levelNumber >= 1 && levelNumber <= 20) {
    return RIFKI_LEVELS[levelNumber - 1]!;
  }
  return generateInfiniteLevel(levelNumber);
}

export function generateInfiniteLevel(levelNumber: number): LevelConfig {
  const base = RIFKI_LEVELS[19]!;
  const infiniteIndex = levelNumber - 21;

  const maxMoves = Math.max(12, 30 - Math.floor(infiniteIndex / 5));
  const targetScore = Math.round(base.targetScore * Math.pow(1.15, levelNumber - 20));

  const colorCount = Math.min(EASY_COLORS.length, 2 + Math.floor(infiniteIndex / 3));
  const perColorCount = 20 + Math.floor(infiniteIndex / 3) * 5;
  const targetMatches = Array.from({ length: colorCount }, (_, idx) => ({
    color: EASY_COLORS[idx % EASY_COLORS.length]!,
    count: perColorCount,
  }));

  return {
    id: levelNumber,
    name: `Sonsuz ${levelNumber - 20}`,
    maxMoves,
    targetScore,
    targetMatches,
    enemyConfig: {
      firstSpawnDelayMs: getFirstSpawnDelay(levelNumber),
      moveIntervalMs: getMoveIntervalMs(levelNumber),
      respawnDelayMs: getRespawnDelay(levelNumber),
    },
  };
}
