import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  mergeKeyboardStates,
  scoreGunlukKelimeGuess,
  tryScoreGunlukKelimeGuess,
  type LetterState,
} from './engine';

describe('gunluk-kelime engine', () => {
  it('scores exact matches as correct', () => {
    assert.deepEqual(scoreGunlukKelimeGuess('KALEM', 'KALEM'), [
      'correct',
      'correct',
      'correct',
      'correct',
      'correct',
    ]);
  });

  it('consumes duplicate letters only once after exact matches', () => {
    assert.deepEqual(scoreGunlukKelimeGuess('KALEM', 'LEKEK'), [
      'present',
      'absent',
      'present',
      'correct',
      'absent',
    ]);
  });

  it('keeps Turkish I and İ as separate letters', () => {
    assert.deepEqual(scoreGunlukKelimeGuess('IRMAK', 'İRMİK'), [
      'absent',
      'correct',
      'correct',
      'absent',
      'correct',
    ]);
  });

  it('does not downgrade stronger keyboard states', () => {
    const current: Record<string, LetterState> = {
      A: 'correct',
      B: 'present',
      C: 'absent',
    };

    assert.deepEqual(
      mergeKeyboardStates(current, 'ABCDE', ['present', 'absent', 'correct', 'empty', 'typing']),
      {
        A: 'correct',
        B: 'present',
        C: 'correct',
      },
    );
  });

  it('returns null instead of throwing for invalid guess lengths', () => {
    assert.equal(tryScoreGunlukKelimeGuess('KALEM', 'KAL'), null);
  });
});
