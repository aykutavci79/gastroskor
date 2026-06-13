import {
  resolveVoiceMenuLines,
  type VoiceOrderCommand,
  type VoiceOrderLineIntent,
} from '@/lib/parse-voice-order-command';
import type { RestaurantListItem, VoiceMenuMatch } from '@/lib/types';
import type { VoiceOrderRestaurantOption } from '@/lib/voice-order-letters';

export type SmartCartLineResolution = {
  lineIndex: number;
  intent: VoiceOrderLineIntent;
  match: VoiceMenuMatch;
  lineTotal: number;
};

export type SmartCartCandidate = {
  restaurantId: string;
  restaurantName: string;
  restaurantIndex: number;
  letter: string;
  lines: SmartCartLineResolution[];
  orderTotal: number;
  distanceMeters: number | null;
  selectedByLine: Record<number, VoiceMenuMatch>;
};

function resolveLineCheapest(
  matches: VoiceMenuMatch[],
  intent: VoiceOrderLineIntent,
): VoiceMenuMatch | null {
  const stub: VoiceOrderCommand = {
    rawText: '',
    restaurantIndex: null,
    restaurantLetter: null,
    restaurantName: null,
    lines: [intent],
    quantity: intent.quantity,
    productSearchGroup: intent.productSearchGroup,
    productSlug: intent.productSlug,
    productLabel: intent.productLabel,
    paymentNote: '',
    priceMaxBudget: null,
    issues: [],
    confidence: 'partial',
  };
  const { rows } = resolveVoiceMenuLines(matches, stub);
  const row = rows[0];
  if (!row) return null;
  if (row.line) return row.line;
  if (row.choices.length) {
    return [...row.choices].sort((a, b) => a.price_tl - b.price_tl)[0] ?? null;
  }
  return null;
}

function buildCandidateForRestaurant(
  restaurant: RestaurantListItem,
  restaurantIndex: number,
  letter: string,
  command: VoiceOrderCommand,
): SmartCartCandidate | null {
  const matches = restaurant.voice_menu_matches ?? [];
  if (!matches.length || !command.lines.length) return null;

  const lines: SmartCartLineResolution[] = [];
  const selectedByLine: Record<number, VoiceMenuMatch> = {};

  for (let index = 0; index < command.lines.length; index += 1) {
    const intent = command.lines[index];
    const match = resolveLineCheapest(matches, intent);
    if (!match) return null;
    selectedByLine[index] = match;
    lines.push({
      lineIndex: index,
      intent,
      match,
      lineTotal: match.price_tl * intent.quantity,
    });
  }

  const orderTotal = lines.reduce((sum, row) => sum + row.lineTotal, 0);
  if (command.priceMaxBudget != null && orderTotal > command.priceMaxBudget) return null;

  return {
    restaurantId: restaurant.id,
    restaurantName: restaurant.name,
    restaurantIndex,
    letter,
    lines,
    orderTotal,
    distanceMeters: restaurant.distance_meters ?? null,
    selectedByLine,
  };
}

/** Bütçeye uyan restoranları toplam fiyata göre sırala (eşitlikte mesafe). */
export function rankSmartCartCandidates(
  restaurants: RestaurantListItem[],
  command: VoiceOrderCommand,
  options: VoiceOrderRestaurantOption[],
): SmartCartCandidate[] {
  if (!command.lines.length) return [];

  const letterById = new Map(options.map((row) => [row.id, row.letter]));
  const candidates: SmartCartCandidate[] = [];

  restaurants.forEach((restaurant, index) => {
    const letter = letterById.get(restaurant.id) ?? String.fromCharCode(65 + index);
    const candidate = buildCandidateForRestaurant(restaurant, index, letter, command);
    if (candidate) candidates.push(candidate);
  });

  candidates.sort((a, b) => {
    if (a.orderTotal !== b.orderTotal) return a.orderTotal - b.orderTotal;
    const distA = a.distanceMeters ?? Number.MAX_SAFE_INTEGER;
    const distB = b.distanceMeters ?? Number.MAX_SAFE_INTEGER;
    return distA - distB;
  });

  return candidates;
}

export function pickBestSmartCartCandidate(
  restaurants: RestaurantListItem[],
  command: VoiceOrderCommand,
  options: VoiceOrderRestaurantOption[],
): SmartCartCandidate | null {
  return rankSmartCartCandidates(restaurants, command, options)[0] ?? null;
}

export function enrichVoiceOrderCommandWithCandidate(
  command: VoiceOrderCommand,
  candidate: SmartCartCandidate,
): VoiceOrderCommand {
  return {
    ...command,
    restaurantIndex: candidate.restaurantIndex,
    restaurantLetter: candidate.letter,
    restaurantName: candidate.restaurantName,
    confidence: 'high',
    issues: [],
  };
}

export function smartCartProductGroups(command: VoiceOrderCommand): string[] {
  return [...new Set(command.lines.map((row) => row.productSearchGroup))];
}

export function isSmartCartCommand(command: VoiceOrderCommand): boolean {
  return command.restaurantIndex == null && command.lines.length > 0;
}

/** Akıllı sepet neden başarısız oldu — TTS için kısa açıklama. */
export function explainSmartCartFailure(
  restaurants: RestaurantListItem[],
  command: VoiceOrderCommand,
  options: VoiceOrderRestaurantOption[],
): string {
  const productList = command.lines.map((row) => row.productLabel).join(', ');

  if (!restaurants.length) {
    return `${productList} birlikte sunan restoran bulamadım.`;
  }

  const withoutBudget: VoiceOrderCommand = { ...command, priceMaxBudget: null };
  const affordable = rankSmartCartCandidates(restaurants, command, options);
  if (affordable.length) {
    return 'Bu sepeti karşılayan restoran bulamadım.';
  }

  const cheapest = rankSmartCartCandidates(restaurants, withoutBudget, options)[0];
  if (cheapest && command.priceMaxBudget != null) {
    const total = Math.round(cheapest.orderTotal);
    return `Sepet en düşük ${total} TL tutuyor; ${command.priceMaxBudget} TL bütçeni aşıyor.`;
  }

  return `${productList} birlikte sunan restoran bulamadım.`;
}
