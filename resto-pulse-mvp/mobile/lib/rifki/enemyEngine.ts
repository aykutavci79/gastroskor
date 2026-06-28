export type EnemyType = 'YILAN' | 'CIYAN';

export type EnemyState = {
  isActive: boolean;
  type: EnemyType;
  position: number;
  moveIntervalMs: number;
  isAnimating: boolean;
};

const ENEMY_TYPES: EnemyType[] = ['YILAN', 'CIYAN'];

function pickEnemyType(): EnemyType {
  const idx = Math.floor(Math.random() * ENEMY_TYPES.length);
  return ENEMY_TYPES[idx] ?? 'YILAN';
}

export function getMoveIntervalMs(levelNumber: number): number {
  if (levelNumber <= 5) return 4000;
  if (levelNumber <= 10) return 3000;
  if (levelNumber <= 15) return 2500;
  if (levelNumber <= 20) return 2000;

  const extraLevels = levelNumber - 21;
  const reductions = Math.floor(extraLevels / 5) + 1;
  return Math.max(1500, 2000 - reductions * 200);
}

export function createEnemy(levelNumber: number): EnemyState {
  return {
    isActive: true,
    type: pickEnemyType(),
    position: 7,
    moveIntervalMs: getMoveIntervalMs(levelNumber),
    isAnimating: false,
  };
}

export function moveEnemyCloser(enemy: EnemyState): EnemyState {
  if (enemy.isAnimating) return enemy;
  return {
    ...enemy,
    position: Math.max(0, enemy.position - 1),
  };
}

export function pushEnemyBack(enemy: EnemyState, matchSize: number): EnemyState {
  if (matchSize >= 5) {
    return { ...enemy, position: 8 };
  }
  if (matchSize === 4) {
    return { ...enemy, position: Math.min(7, enemy.position + 2) };
  }
  return { ...enemy, position: Math.min(7, enemy.position + 1) };
}

export function isEnemyDead(enemy: EnemyState): boolean {
  return enemy.position >= 8;
}

export function hasEnemyCaughtRifki(enemy: EnemyState): boolean {
  return enemy.position <= 0;
}

export function getFirstSpawnDelay(levelNumber: number): number {
  if (levelNumber <= 5) return 25000;
  if (levelNumber <= 10) return 20000;
  if (levelNumber <= 15) return 15000;
  return 10000;
}

export function getRespawnDelay(levelNumber: number): number {
  if (levelNumber <= 5) return 20000;
  if (levelNumber <= 10) return 15000;
  return 10000;
}
