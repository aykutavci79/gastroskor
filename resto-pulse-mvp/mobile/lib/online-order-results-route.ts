import type { Href } from 'expo-router';

import { buildOnlineOrderScreenHref } from '@/lib/online-order-screen-route';
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
  return buildOnlineOrderScreenHref({ mode: 'filter', ...params });
}

export function buildOnlineOrderVoiceResultsHref(
  query: VoiceOrderQuery,
  extras?: { minRating?: number; sort?: OnlineOrderSortMode },
): Href {
  if (!query.voiceProduct && !query.isCartOrder) {
    throw new Error('voiceProduct or cart order required');
  }
  return buildOnlineOrderScreenHref({
    mode: 'voice',
    voiceProduct: query.voiceProduct ?? query.cartLines[0]?.productSearchGroup ?? 'sepet',
    priceMax: query.isCartOrder ? null : query.priceMax,
    priceMaxBudget: query.priceMaxBudget,
    maxDistanceKm: query.maxDistanceKm,
    minRating: query.minRating ?? extras?.minRating ?? 3,
    sort: extras?.sort,
    voiceText: query.rawText.trim() || undefined,
  });
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
