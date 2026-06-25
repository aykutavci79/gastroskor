import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  autoSolveFullyRevealedWordIds,
  buildSofraRevealedCellKeys,
  hucreAcikMi,
  ipucuHakkiKaldi,
  isWordFullyRevealed,
  kelimeCarktanOlusur,
  partialOfUnfoundLongerTarget,
  sameAxisAlignedSubstringOfUnfoundLonger,
  sameAxisSubstringSpoiler,
  sofraMaxIpucu,
} from './engine.ts';
import type { SofraGridCell, SofraPlacedWord, SofraPuzzle } from './types.ts';

/** BALIK yatay + ?KAL dikey (4 harf) — KAL sonek olarak uzun kelimenin parçası. */
const BALIK_KAL_SCENARIO: SofraPlacedWord[] = [
  {
    id: 'balik',
    kelime: 'BALIK',
    row: 3,
    col: 0,
    direction: 'h',
  },
  {
    id: 'kal',
    kelime: 'KAL',
    row: 1,
    col: 2,
    direction: 'v',
  },
  {
    id: 'ekal',
    kelime: 'EKAL',
    row: 0,
    col: 2,
    direction: 'v',
  },
];

describe('partialOfUnfoundLongerTarget', () => {
  it('GEL → GELİN (farklı sütun) engeller', () => {
    const words: SofraPlacedWord[] = [
      { id: 'gelin', kelime: 'GELİN', row: 0, col: 2, direction: 'v' },
      { id: 'gel', kelime: 'GEL', row: 2, col: 4, direction: 'v' },
    ];
    const blocked = partialOfUnfoundLongerTarget(words, 'GEL', []);
    assert.equal(blocked?.kelime, 'GELİN');
  });

  it('GELİN bulunduktan sonra GEL serbest', () => {
    const words: SofraPlacedWord[] = [
      { id: 'gelin', kelime: 'GELİN', row: 0, col: 2, direction: 'v' },
      { id: 'gel', kelime: 'GEL', row: 2, col: 4, direction: 'v' },
    ];
    const blocked = partialOfUnfoundLongerTarget(words, 'GEL', ['gelin']);
    assert.equal(blocked, null);
  });
});

describe('sameAxisAlignedSubstringOfUnfoundLonger', () => {
  it('önek YAK → YAKA engeller', () => {
    const words: SofraPlacedWord[] = [
      { id: 'yaka', kelime: 'YAKA', row: 0, col: 0, direction: 'h' },
    ];
    const blocked = sameAxisAlignedSubstringOfUnfoundLonger(words, 'YAK', []);
    assert.equal(blocked?.kelime, 'YAKA');
  });

  it('sonek KAL → EKAL (4 harf) engeller — kısmi kutu doldurma yok', () => {
    const blocked = sameAxisAlignedSubstringOfUnfoundLonger(
      BALIK_KAL_SCENARIO,
      'KAL',
      ['balik'],
    );
    assert.equal(blocked?.kelime, 'EKAL');
  });

  it('uzun kelime bulunduktan sonra kısa kabul edilebilir', () => {
    const blocked = sameAxisAlignedSubstringOfUnfoundLonger(
      BALIK_KAL_SCENARIO,
      'KAL',
      ['balik', 'ekal'],
    );
    assert.equal(blocked, null);
  });
});

describe('sameAxisSubstringSpoiler', () => {
  it('KAL hedefi EKAL bulunmadan spoiler sayılır', () => {
    const kal = BALIK_KAL_SCENARIO.find((w) => w.kelime === 'KAL')!;
    const spoiler = sameAxisSubstringSpoiler(BALIK_KAL_SCENARIO, kal, ['balik']);
    assert.equal(spoiler?.kelime, 'EKAL');
  });
});

describe('kelimeCarktanOlusur', () => {
  it('seçilen path harfleri kelimeyi sırayla ve tekrar kullanmadan oluşturur', () => {
    const wheel = ['K', 'A', 'L', 'E', 'M'];
    assert.equal(kelimeCarktanOlusur('kal', wheel, [0, 1, 2]), true);
    assert.equal(kelimeCarktanOlusur('kal', wheel, [0, 0, 2]), false);
    assert.equal(kelimeCarktanOlusur('kal', wheel, [0, 1]), false);
  });

  it('path doğru olsa bile yanlış harf sırasını kabul etmez', () => {
    const wheel = ['K', 'A', 'L', 'E', 'M'];
    assert.equal(kelimeCarktanOlusur('kal', wheel, [0, 2, 1]), false);
  });
});

function cell(row: number, col: number, letter: string, wordIds: string[]): SofraGridCell {
  return { row, col, letter, wordIds };
}

/** BALIK yatay + KAL dikey (L kesişimi) — kesişim ipucu sayılmaz. */
function balikKalCrossPuzzle(): Pick<SofraPuzzle, 'grid' | 'words'> {
  const balik: SofraPlacedWord = {
    id: 'balik',
    kelime: 'BALIK',
    row: 3,
    col: 0,
    direction: 'h',
  };
  const kal: SofraPlacedWord = {
    id: 'kal',
    kelime: 'KAL',
    row: 1,
    col: 2,
    direction: 'v',
  };
  const grid: (SofraGridCell | null)[][] = [
    [null, null, null, null, null],
    [null, null, cell(1, 2, 'K', ['kal']), null, null],
    [null, null, cell(2, 2, 'A', ['kal']), null, null],
    [
      cell(3, 0, 'B', ['balik']),
      cell(3, 1, 'A', ['balik']),
      cell(3, 2, 'L', ['balik', 'kal']),
      cell(3, 3, 'I', ['balik']),
      cell(3, 4, 'K', ['balik']),
    ],
  ];
  return { grid, words: [balik, kal] };
}

describe('isWordFullyRevealed', () => {
  it('kesişim harfi ipucu değilse kelime tamamlanmış sayılmaz', () => {
    const { grid, words } = balikKalCrossPuzzle();
    const kal = words.find((w) => w.kelime === 'KAL')!;
    const hinted = ['1,2', '2,2'];
    assert.equal(isWordFullyRevealed(kal, { grid }, hinted), false);
  });

  it('kelimenin tüm grid hücreleri ipucuysa tamamlanmış sayılır', () => {
    const { grid, words } = balikKalCrossPuzzle();
    const kal = words.find((w) => w.kelime === 'KAL')!;
    const hinted = ['1,2', '2,2', '3,2'];
    assert.equal(isWordFullyRevealed(kal, { grid }, hinted), true);
  });
});

describe('buildSofraRevealedCellKeys', () => {
  it('uzun kelime bulunmadan sonek hedefin hücrelerini açmaz', () => {
    const revealed = buildSofraRevealedCellKeys(BALIK_KAL_SCENARIO, ['kal'], []);
    assert.equal(revealed.has('1,2'), false);
    assert.equal(revealed.has('2,2'), false);
    assert.equal(revealed.has('3,2'), false);
  });

  it('ipucu hücresi spoiler bloklansa bile açık kalır', () => {
    const revealed = buildSofraRevealedCellKeys(BALIK_KAL_SCENARIO, ['kal'], ['1,2']);
    assert.equal(revealed.has('1,2'), true);
    assert.equal(revealed.has('2,2'), false);
  });
});

describe('hucreAcikMi', () => {
  it('aynı eksendeki uzun kelime bulunmadan kısa hedefin hücresini kapalı tutar', () => {
    const kCell = cell(1, 2, 'K', ['kal', 'ekal']);
    assert.equal(hucreAcikMi(kCell, ['kal'], [], BALIK_KAL_SCENARIO), false);
    assert.equal(hucreAcikMi(kCell, ['kal'], ['1,2'], BALIK_KAL_SCENARIO), true);
  });
});

describe('autoSolveFullyRevealedWordIds', () => {
  it('BALIK bulunmuş + 2 ipucu — KAL otomatik çözülmez (L kesişimi sayılmaz)', () => {
    const { grid, words } = balikKalCrossPuzzle();
    const puzzle = { grid, words } as SofraPuzzle;
    const autoIds = autoSolveFullyRevealedWordIds(puzzle, ['balik'], ['1,2', '2,2']);
    assert.deepEqual(autoIds, []);
  });

  it('tüm hücreleri ipucuyla açılan kelime otomatik çözülür', () => {
    const { grid, words } = balikKalCrossPuzzle();
    const puzzle = { grid, words } as SofraPuzzle;
    const autoIds = autoSolveFullyRevealedWordIds(puzzle, ['balik'], ['1,2', '2,2', '3,2']);
    assert.deepEqual(autoIds, ['kal']);
  });
});

describe('ipucu hakları', () => {
  it('bonus kelime eşiğine göre maksimum ipucu hakkını artırır', () => {
    assert.equal(sofraMaxIpucu(0), 8);
    assert.equal(sofraMaxIpucu(2), 8);
    assert.equal(sofraMaxIpucu(3), 9);
  });

  it('kullanılan ipucu sayısı limite ulaştığında yeni ipucu vermez', () => {
    assert.equal(ipucuHakkiKaldi(7, 0), true);
    assert.equal(ipucuHakkiKaldi(8, 0), false);
    assert.equal(ipucuHakkiKaldi(8, 3), true);
  });
});
