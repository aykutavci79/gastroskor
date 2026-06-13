import type { ReviewCategory } from '@/lib/types';
import { categoryTitle } from '@/lib/scores';

import { ProgressBar } from '@/components/ProgressBar';

type Props = {
  categories: ReviewCategory[];
  summary?: string | null;
  sentimentLabel?: string | null;
  sentimentScore?: number | null;
  heading?: string;
};

export function CategoryScoresPanel({
  categories,
  summary,
  sentimentLabel,
  sentimentScore,
  heading = 'Yapay Zeka Skorlari',
}: Props) {
  return (
    <section className="rounded-2xl border border-border/70 bg-surface-card p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-content">{heading}</h2>
          <p className="text-sm text-content-muted">Lezzet, servis, fiyat ve hijyen (1-10)</p>
        </div>
        {sentimentScore != null ? (
          <div className="rounded-xl bg-surface-input px-4 py-2 text-right">
            <p className="text-xs uppercase tracking-wide text-content-muted">Genel</p>
            <p className="text-2xl font-bold text-accent">{sentimentScore}/10</p>
            <p className="text-xs capitalize text-content-muted">{sentimentLabel ?? 'neutral'}</p>
          </div>
        ) : null}
      </div>

      <div className="space-y-4">
        {categories.map((row) => (
          <ProgressBar
            key={row.category}
            label={categoryTitle(row.category)}
            score={row.score}
            hint={row.reason}
          />
        ))}
      </div>

      {summary ? (
        <p className="mt-5 rounded-xl border border-border bg-surface-input/60 p-4 text-sm text-content-muted">
          {summary}
        </p>
      ) : null}
    </section>
  );
}
