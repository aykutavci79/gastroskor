import type { Review } from '@/lib/types';
import { sentimentColor } from '@/lib/scores';

import { StarRating } from '@/components/StarRating';

function reviewSourceLabel(review: Review): string | null {
  if (review.is_demo) {
    return 'Demo yorum';
  }
  if (review.source_platform === 'google_maps') {
    return "Google'dan senkron";
  }
  if (review.source_platform) {
    return review.source_platform;
  }
  return 'GastroSkor iç yorumu';
}

type Props = {
  reviews: Review[];
};

export function ReviewList({ reviews }: Props) {
  if (reviews.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-slate-400">
        Henuz yorum yok. Ilk yorumu sen yaz.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <article
          key={review.id}
          className="rounded-2xl border border-slate-700/70 bg-slate-900/50 p-5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <StarRating value={review.rating} readonly />
              {reviewSourceLabel(review) ? (
                <span
                  className={
                    review.is_demo
                      ? 'rounded-full border border-violet-500/40 bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-200'
                      : review.source_platform === 'google_maps'
                        ? 'rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200'
                        : 'rounded-full border border-slate-600 bg-slate-800/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300'
                  }>
                  {reviewSourceLabel(review)}
                </span>
              ) : null}
            </div>
            {review.sentiment_score != null ? (
              <span className={`text-sm font-medium ${sentimentColor(review.sentiment_label)}`}>
                AI: {review.sentiment_score}/10 ({review.sentiment_label})
              </span>
            ) : (
              <span className="text-xs text-slate-500">Analiz bekliyor</span>
            )}
          </div>
          <p className="text-slate-200">{review.review_text}</p>
          {review.ai_summary ? (
            <p className="mt-3 text-sm text-slate-400">{review.ai_summary}</p>
          ) : null}
        </article>
      ))}
    </div>
  );
}
