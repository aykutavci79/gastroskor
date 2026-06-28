import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  createEnemy,
  getFirstSpawnDelay,
  getMoveIntervalMs,
  getRespawnDelay,
  hasEnemyCaughtRifki,
  isEnemyDead,
  moveEnemyCloser,
  pushEnemyBack,
} from './enemyEngine';
import { RIFKI_LEVELS, generateInfiniteLevel, getLevelConfig } from './levelConfig';

describe('rifki enemyEngine', () => {
  it('createEnemy scales move interval by level', () => {
    const easy = createEnemy(1);
    const mid = createEnemy(10);
    assert.equal(easy.position, 7);
    assert.equal(easy.moveIntervalMs, 4000);
    assert.equal(mid.moveIntervalMs, 3000);
    assert.ok(['YILAN', 'CIYAN'].includes(easy.type));
  });

  it('moveEnemyCloser pauses while animating', () => {
    const enemy = { ...createEnemy(1), isAnimating: true, position: 5 };
    assert.equal(moveEnemyCloser(enemy).position, 5);
    assert.equal(moveEnemyCloser({ ...enemy, isAnimating: false }).position, 4);
  });

  it('pushEnemyBack applies match-size rules', () => {
    const base = { ...createEnemy(1), position: 4 };
    assert.equal(pushEnemyBack(base, 3).position, 5);
    assert.equal(pushEnemyBack(base, 4).position, 6);
    assert.equal(pushEnemyBack(base, 5).position, 8);
    assert.equal(isEnemyDead(pushEnemyBack(base, 5)), true);
  });

  it('hasEnemyCaughtRifki at position 0', () => {
    const enemy = { ...createEnemy(1), position: 0 };
    assert.equal(hasEnemyCaughtRifki(enemy), true);
  });

  it('spawn delays follow tier table', () => {
    assert.equal(getFirstSpawnDelay(3), 25000);
    assert.equal(getFirstSpawnDelay(8), 20000);
    assert.equal(getFirstSpawnDelay(12), 15000);
    assert.equal(getFirstSpawnDelay(18), 10000);
    assert.equal(getRespawnDelay(4), 20000);
    assert.equal(getRespawnDelay(9), 15000);
    assert.equal(getRespawnDelay(14), 10000);
  });

  it('infinite levels tighten after level 20', () => {
    assert.equal(getMoveIntervalMs(25), 1800);
    assert.equal(getMoveIntervalMs(40), 1500);
  });
});

describe('rifki levelConfig', () => {
  it('exports 20 fixed levels', () => {
    assert.equal(RIFKI_LEVELS.length, 20);
    assert.equal(RIFKI_LEVELS[0]?.maxMoves, 40);
    assert.equal(RIFKI_LEVELS[19]?.targetScore, 15000);
  });

  it('adds targetMatches from level 6', () => {
    assert.equal(RIFKI_LEVELS[4]?.targetMatches, undefined);
    assert.ok(RIFKI_LEVELS[5]?.targetMatches?.length === 1);
    assert.ok(RIFKI_LEVELS[14]?.targetMatches?.length === 2);
  });

  it('generateInfiniteLevel scales difficulty', () => {
    const level21 = generateInfiniteLevel(21);
    const level30 = generateInfiniteLevel(30);
    assert.equal(level21.maxMoves, 30);
    assert.ok(level30.targetScore > level21.targetScore);
    assert.ok((level30.targetMatches?.length ?? 0) >= (level21.targetMatches?.length ?? 0));
  });

  it('getLevelConfig returns fixed or infinite config', () => {
    assert.equal(getLevelConfig(1).id, 1);
    assert.equal(getLevelConfig(25).id, 25);
  });
});
