'use client';

import type { Review } from '@/lib/types';

import { GsReviewCard } from '@/components/GsReviewCard';

type Props = {
  reviews: Review[];
  viewerEmail?: string | null;
  onReviewChange?: (review: Review) => void;
  onReviewDelete?: (reviewId: string) => void;
};

export function ReviewList({
  reviews,
  viewerEmail = null,
  onReviewChange,
  onReviewDelete,
}: Props) {
  if (reviews.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center text-content-muted">
        Henuz yorum yok. Ilk yorumu sen yaz.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <GsReviewCard
          key={review.id}
          review={review}
          viewerEmail={viewerEmail}
          onChange={(updated) => onReviewChange?.(updated)}
          onDelete={(reviewId) => onReviewDelete?.(reviewId)}
        />
      ))}
    </div>
  );
}
