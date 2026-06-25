import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  mergeKeyboardStates,
  scoreGunlukKelimeGuess,
  tryScoreGunlukKelimeGuess,
} from './engine.ts';

describe('scoreGunlukKelimeGuess', () => {
  it('tam eşleşmede tüm harfleri correct döndürür', () => {
    assert.deepEqual(scoreGunlukKelimeGuess('BALIK', 'BALIK'), [
      'correct',
      'correct',
      'correct',
      'correct',
      'correct',
    ]);
  });

  it('Türkçe harfleri bire bir karşılaştırır: I ve İ aynı sayılmaz', () => {
    assert.deepEqual(scoreGunlukKelimeGuess('ISLAK', 'İSLAK'), [
      'absent',
      'correct',
      'correct',
      'correct',
      'correct',
    ]);
  });

  it('çift harfleri answer içindeki kalan kota kadar present yapar', () => {
    assert.deepEqual(scoreGunlukKelimeGuess('KİLİM', 'LİLİİ'), [
      'absent',
      'correct',
      'correct',
      'correct',
      'absent',
    ]);
  });
});

describe('tryScoreGunlukKelimeGuess', () => {
  it('geçersiz uzunlukta crash yerine null döndürür', () => {
    assert.equal(tryScoreGunlukKelimeGuess('BALIK', 'BAL'), null);
  });
});

describe('mergeKeyboardStates', () => {
  it('klavye harflerinde daha güçlü durumu korur ve düşük duruma geriletmez', () => {
    const merged = mergeKeyboardStates(
      { A: 'absent', K: 'correct' },
      'KALIP',
      ['absent', 'present', 'correct', 'absent', 'absent'],
    );
    assert.equal(merged.K, 'correct');
    assert.equal(merged.A, 'present');
    assert.equal(merged.L, 'correct');
  });
});
