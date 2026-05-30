import type { Review } from '@/lib/types';

export function averageGsRating(reviews: Review[]): number | null {
  if (reviews.length === 0) return null;
  const sum = reviews.reduce((acc, row) => acc + row.rating, 0);
  return Math.round((sum / reviews.length) * 10) / 10;
}

export function formatReviewDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function renderStarRow(rating: number): string {
  const safe = Math.max(0, Math.min(5, Math.round(rating)));
  return `${'★'.repeat(safe)}${'☆'.repeat(5 - safe)}`;
}
