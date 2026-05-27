import type { Review, ReviewCategory } from '@/lib/types';
import { CATEGORY_LABELS } from '@/lib/types';

const DEFAULT_CATEGORIES = ['lezzet', 'servis', 'fiyat', 'hijyen'];

export function aggregateCategoryScores(reviews: Review[]): ReviewCategory[] {
  const buckets: Record<string, number[]> = {};
  for (const key of DEFAULT_CATEGORIES) {
    buckets[key] = [];
  }

  for (const review of reviews) {
    for (const row of review.categories ?? []) {
      if (row.score == null) continue;
      if (!buckets[row.category]) buckets[row.category] = [];
      buckets[row.category].push(row.score);
    }
  }

  return DEFAULT_CATEGORIES.map((category) => {
    const values = buckets[category] ?? [];
    const score =
      values.length > 0
        ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
        : null;
    return {
      category,
      score,
      label: score == null ? null : score >= 7 ? 'positive' : score <= 4 ? 'negative' : 'neutral',
      reason: values.length > 0 ? `${values.length} analizli yorum ortalamasi` : null,
    };
  });
}

export function categoryTitle(category: string) {
  return CATEGORY_LABELS[category] ?? category;
}

export function sentimentColor(label: string | null | undefined) {
  if (label === 'positive') return 'text-good';
  if (label === 'negative') return 'text-bad';
  return 'text-warn';
}

export function scoreBarColor(score: number | null) {
  if (score == null) return 'bg-slate-600';
  if (score >= 7) return 'bg-good';
  if (score <= 4) return 'bg-bad';
  return 'bg-warn';
}
