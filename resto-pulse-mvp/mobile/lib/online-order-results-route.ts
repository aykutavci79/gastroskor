import type { Href } from 'expo-router';

import type { OnlineOrderSortMode } from '@/lib/online-order-sort';
import type { VoiceOrderQuery } from '@/lib/parse-voice-order-query';

export type OnlineOrderFilterResultsParams = {
  mode: 'filter';
  slugs: string[];
  maxDistanceKm: number;
  minRating: number;
  sort?: OnlineOrderSortMode;
};

export type OnlineOrderVoiceResultsParams = {
  mode: 'voice';
  voiceProduct: string;
  priceMax: number | null;
  priceMaxBudget?: number | null;
  maxDistanceKm: number | null;
  minRating: number;
  sort?: OnlineOrderSortMode;
  voiceText?: string;
};

export type OnlineOrderResultsParams = OnlineOrderFilterResultsParams | OnlineOrderVoiceResultsParams;

function routeParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0]?.trim() || null;
  return value?.trim() || null;
}

function routeNumber(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const SORT_MODES: OnlineOrderSortMode[] = ['gastro_score', 'distance', 'rating', 'popularity', 'discount'];

function parseSort(value: string | null): OnlineOrderSortMode | undefined {
  if (!value) return undefined;
  return SORT_MODES.includes(value as OnlineOrderSortMode)
    ? (value as OnlineOrderSortMode)
    : undefined;
}

export function buildOnlineOrderFilterResultsHref(
  params: Omit<OnlineOrderFilterResultsParams, 'mode'>,
): Href {
  const q = new URLSearchParams();
  q.set('mode', 'filter');
  if (params.slugs.length) q.set('slugs', params.slugs.join(','));
  q.set('maxKm', String(params.maxDistanceKm));
  q.set('minRating', String(params.minRating));
  if (params.sort) q.set('sort', params.sort);
  return `/siparis-acik-sonuclar?${q.toString()}` as Href;
}

export function buildOnlineOrderVoiceResultsHref(
  query: VoiceOrderQuery,
  extras?: { minRating?: number; sort?: OnlineOrderSortMode },
): Href {
  if (!query.voiceProduct && !query.isCartOrder) {
    throw new Error('voiceProduct or cart order required');
  }
  const q = new URLSearchParams();
  q.set('mode', 'voice');
  if (query.voiceProduct) q.set('voiceProduct', query.voiceProduct);
  if (query.priceMax != null && !query.isCartOrder) q.set('priceMax', String(query.priceMax));
  if (query.priceMaxBudget != null) q.set('priceMaxBudget', String(query.priceMaxBudget));
  if (query.maxDistanceKm != null) q.set('maxDistanceKm', String(query.maxDistanceKm));
  q.set('minRating', String(query.minRating ?? extras?.minRating ?? 3));
  if (extras?.sort) q.set('sort', extras.sort);
  if (query.rawText.trim()) q.set('voiceText', query.rawText.trim());
  return `/siparis-acik-sonuclar?${q.toString()}` as Href;
}

export function parseOnlineOrderResultsRouteParams(
  params: Record<string, string | string[] | undefined>,
): OnlineOrderResultsParams | null {
  const mode = routeParam(params.mode);

  if (mode === 'voice') {
    const voiceProduct = routeParam(params.voiceProduct);
    if (!voiceProduct) return null;
    return {
      mode: 'voice',
      voiceProduct,
      priceMax: routeNumber(routeParam(params.priceMax)),
      priceMaxBudget: routeNumber(routeParam(params.priceMaxBudget)),
      maxDistanceKm: routeNumber(routeParam(params.maxDistanceKm)),
      minRating: routeNumber(routeParam(params.minRating)) ?? 3,
      sort: parseSort(routeParam(params.sort)),
      voiceText: routeParam(params.voiceText) ?? undefined,
    };
  }

  if (mode === 'filter') {
    const slugsRaw = routeParam(params.slugs);
    return {
      mode: 'filter',
      slugs: slugsRaw
        ? slugsRaw
            .split(',')
            .map((slug) => slug.trim())
            .filter(Boolean)
        : [],
      maxDistanceKm: routeNumber(routeParam(params.maxKm)) ?? 5,
      minRating: routeNumber(routeParam(params.minRating)) ?? 3,
      sort: parseSort(routeParam(params.sort)),
    };
  }

  return null;
}
