import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  mergeKeyboardStates,
  scoreGunlukKelimeGuess,
  tryScoreGunlukKelimeGuess,
  type LetterState,
} from './engine';

describe('gunluk-kelime engine', () => {
  it('scores duplicate letters by consuming exact matches before present letters', () => {
    const states = scoreGunlukKelimeGuess('BALIK', 'KABAK');

    assert.deepEqual(states, ['absent', 'correct', 'present', 'absent', 'correct']);
  });

  it('keeps Turkish dotted/dotless and accented letters distinct while scoring', () => {
    const states = scoreGunlukKelimeGuess('CİĞER', 'CIGER');

    assert.deepEqual(states, ['correct', 'absent', 'absent', 'correct', 'correct']);
  });

  it('returns null instead of throwing for invalid guess length', () => {
    assert.equal(tryScoreGunlukKelimeGuess('BALIK', 'BAL'), null);
  });

  it('merges keyboard states without downgrading stronger evidence', () => {
    const current: Record<string, LetterState> = {
      A: 'correct',
      B: 'present',
      C: 'absent',
    };

    const next = mergeKeyboardStates(current, 'ABCDE', [
      'absent',
      'absent',
      'correct',
      'present',
      'typing',
    ]);

    assert.deepEqual(next, {
      A: 'correct',
      B: 'present',
      C: 'correct',
      D: 'present',
    });
    assert.deepEqual(current, {
      A: 'correct',
      B: 'present',
      C: 'absent',
    });
  });
});
