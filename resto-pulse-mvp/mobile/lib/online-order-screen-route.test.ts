import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildOnlineOrderScreenHref,
  onlineOrderScreenHrefFromLegacySonuclar,
  parseOnlineOrderScreenParams,
} from './online-order-screen-route.ts';

describe('online-order-screen-route', () => {
  it('builds filter href on siparis-acik', () => {
    const href = buildOnlineOrderScreenHref({
      mode: 'filter',
      slugs: ['lahmacun'],
      maxDistanceKm: 5,
      minRating: 3,
    });
    assert.match(String(href), /^\/siparis-acik\?/);
    assert.match(String(href), /mode=filter/);
    assert.match(String(href), /slugs=lahmacun/);
  });

  it('round-trips voice params', () => {
    const href = buildOnlineOrderScreenHref({
      mode: 'voice',
      voiceProduct: 'lahmacun',
      priceMax: 150,
      priceMaxBudget: null,
      maxDistanceKm: 5,
      minRating: 3,
      voiceText: '150 TL lahmacun',
    });
    const q = String(href).split('?')[1] ?? '';
    const parsed = parseOnlineOrderScreenParams(
      Object.fromEntries(new URLSearchParams(q)),
    );
    assert.equal(parsed?.mode, 'voice');
    assert.equal(parsed?.voiceProduct, 'lahmacun');
    assert.equal(parsed?.priceMax, 150);
  });

  it('maps legacy sonuclar query to siparis-acik', () => {
    const href = onlineOrderScreenHrefFromLegacySonuclar(
      'mode=filter&maxKm=3&minRating=3.5',
    );
    assert.match(String(href), /^\/siparis-acik\?/);
    assert.doesNotMatch(String(href), /siparis-acik-sonuclar/);
  });
});
