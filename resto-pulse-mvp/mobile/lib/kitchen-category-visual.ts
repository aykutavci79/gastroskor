import type { OnlineOrderCategory } from '@/constants/online-order-categories';

export const KITCHEN_CATEGORY_EMOJI: Record<string, string> = {
  'tatli-tuzlu': '🍰',
  doner: '🥙',
  'kebap-izgara': '🔥',
  firin: '🍕',
  sokak: '🌭',
  burger: '🍔',
  'ev-yemekleri': '🍲',
  kahvalti: '🍳',
  kahve: '☕',
  deniz: '🐟',
  'salata-fit': '🥗',
};

export function kitchenEmoji(slug: string): string {
  return KITCHEN_CATEGORY_EMOJI[slug] ?? '🍽️';
}

export function kitchenShortLabel(label: string, max = 11): string {
  const first = label.split('&')[0]?.trim() ?? label;
  if (first.length <= max) return first;
  return `${first.slice(0, max - 1)}…`;
}

export type KitchenPickerItem = Pick<OnlineOrderCategory, 'slug' | 'label'>;
