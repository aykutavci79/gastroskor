import type { Href } from 'expo-router';

import {
  parseOnlineOrderResultsRouteParams,
  type OnlineOrderResultsParams,
} from '@/lib/online-order-results-route';

const SCREEN_PATH = '/siparis-acik';

function paramsToQuery(params: OnlineOrderResultsParams): URLSearchParams {
  const q = new URLSearchParams();
  q.set('mode', params.mode);
  if (params.mode === 'filter') {
    if (params.slugs.length) q.set('slugs', params.slugs.join(','));
    q.set('maxKm', String(params.maxDistanceKm));
    q.set('minRating', String(params.minRating));
    if (params.sort) q.set('sort', params.sort);
  } else {
    q.set('voiceProduct', params.voiceProduct);
    if (params.priceMax != null) q.set('priceMax', String(params.priceMax));
    if (params.priceMaxBudget != null) q.set('priceMaxBudget', String(params.priceMaxBudget));
    if (params.maxDistanceKm != null) q.set('maxDistanceKm', String(params.maxDistanceKm));
    q.set('minRating', String(params.minRating));
    if (params.sort) q.set('sort', params.sort);
    if (params.voiceText) q.set('voiceText', params.voiceText);
  }
  return q;
}

export function buildOnlineOrderScreenHref(params: OnlineOrderResultsParams): Href {
  return `${SCREEN_PATH}?${paramsToQuery(params).toString()}` as Href;
}

export function parseOnlineOrderScreenParams(
  params: Record<string, string | string[] | undefined>,
): OnlineOrderResultsParams | null {
  return parseOnlineOrderResultsRouteParams(params);
}

export function onlineOrderScreenHrefFromLegacySonuclar(search: string): Href {
  const raw = search.startsWith('?') ? search.slice(1) : search;
  const parsed = parseOnlineOrderResultsRouteParams(
    Object.fromEntries(new URLSearchParams(raw)),
  );
  if (!parsed) return SCREEN_PATH as Href;
  return buildOnlineOrderScreenHref(parsed);
}
