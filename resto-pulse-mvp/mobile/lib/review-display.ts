import type { Review } from '@/lib/types';

export function isOwnReview(
  review: Review,
  viewerEmail: string | null | undefined,
  viewerUserId?: string | null,
): boolean {
  if (viewerUserId && review.author_id && review.author_id === viewerUserId) return true;
  if (!viewerEmail?.trim() || !review.author_email) return false;
  return review.author_email.toLowerCase() === viewerEmail.trim().toLowerCase();
}

/** Giriş yapmış kullanıcının yorumları en üstte; kendi içinde en yeniden eskiye. */
export function sortReviewsWithViewerFirst(
  reviews: Review[],
  viewerEmail?: string | null,
  viewerUserId?: string | null,
): Review[] {
  if (!viewerEmail?.trim() && !viewerUserId) return reviews;
  return [...reviews].sort((a, b) => {
    const aOwn = isOwnReview(a, viewerEmail ?? null, viewerUserId);
    const bOwn = isOwnReview(b, viewerEmail ?? null, viewerUserId);
    if (aOwn !== bOwn) return aOwn ? -1 : 1;
    const aTime = a.created_at ? Date.parse(a.created_at) : 0;
    const bTime = b.created_at ? Date.parse(b.created_at) : 0;
    return bTime - aTime;
  });
}

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
