import type { ReviewCategory } from '@/lib/types';
import { categoryTitle } from '@/lib/scores';

import { ProgressBar } from '@/components/ProgressBar';

type Props = {
  categories: ReviewCategory[];
  summary?: string | null;
  sentimentLabel?: string | null;
  sentimentScore?: number | null;
};

export function CategoryScoresPanel({
  categories,
  summary,
  sentimentLabel,
  sentimentScore,
}: Props) {
  return (
    <section className="rounded-2xl border border-slate-700/70 bg-panel/80 p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">Yapay Zeka Skorlari</h2>
          <p className="text-sm text-slate-400">Lezzet, servis, fiyat ve hijyen (1-10)</p>
        </div>
        {sentimentScore != null ? (
          <div className="rounded-xl bg-slate-800 px-4 py-2 text-right">
            <p className="text-xs uppercase tracking-wide text-slate-400">Genel</p>
            <p className="text-2xl font-bold text-accent">{sentimentScore}/10</p>
            <p className="text-xs capitalize text-slate-400">{sentimentLabel ?? 'neutral'}</p>
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
        <p className="mt-5 rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-300">
          {summary}
        </p>
      ) : null}
    </section>
  );
}
