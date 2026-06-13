import { categoryLabel, ONLINE_ORDER_CATEGORIES } from '@/constants/online-order-categories';

/** Mutfak chip tıklanınca canlı arama sorgusu (hint anahtar kelimeleri). */
export function kitchenChipSearchQuery(slug: string): string {
  const cat = ONLINE_ORDER_CATEGORIES.find((row) => row.slug === slug);
  if (!cat) return slug.replace(/-/g, ' ');
  if (cat.hint?.trim()) {
    return cat.hint.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
  }
  return cat.label.replace(/&/g, ' ').replace(/\s+/g, ' ').trim();
}

export function kitchenChipLabel(slug: string): string {
  return categoryLabel(slug);
}
