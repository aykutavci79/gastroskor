'use client';

import type { CompetitorAiReport } from '@/lib/types';

type Props = {
  report: CompetitorAiReport;
  onClose: () => void;
};

function InsightList({
  title,
  items,
  accent,
}: {
  title: string;
  items: CompetitorAiReport['competitor_strengths'];
  accent: string;
}) {
  if (items.length === 0) {
    return (
      <section className="rounded-xl border border-slate-700/70 bg-slate-950/50 p-4">
        <h3 className={`text-sm font-semibold ${accent}`}>{title}</h3>
        <p className="mt-2 text-sm text-slate-400">Bu bolum icin yeterli son 3 ay yorumu bulunamadi.</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-700/70 bg-slate-950/50 p-4">
      <h3 className={`text-sm font-semibold ${accent}`}>{title}</h3>
      <ul className="mt-3 space-y-3">
        {items.map((item, idx) => (
          <li key={idx} className="rounded-lg border border-slate-800 bg-slate-900/80 p-3">
            <p className="text-xs uppercase tracking-wider text-slate-500">{item.category}</p>
            <p className="mt-1 text-sm text-slate-200">{item.summary}</p>
            {item.praised_products && item.praised_products.length > 0 ? (
              <p className="mt-2 text-xs text-amber-200">
                One cikan: {item.praised_products.join(', ')}
              </p>
            ) : null}
            {item.evidence_quotes.length > 0 ? (
              <div className="mt-2 space-y-1">
                {item.evidence_quotes.map((quote, qIdx) => (
                  <p key={qIdx} className="text-xs italic text-slate-400">
                    &quot;{quote}&quot;
                  </p>
                ))}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CompetitorAiReportView({ report, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-600 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-violet-300">AI Rakip Analizi</p>
            <h2 className="text-xl font-semibold text-white">
              {report.own_name} vs {report.competitor_name}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Son {report.max_review_age_days} gun · Siz {report.reviews_used.own} · Rakip{' '}
              {report.reviews_used.competitor} ornek yorum
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-600 px-3 py-1 text-sm text-slate-300 hover:bg-slate-800">
            Kapat
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-violet-500/30 bg-violet-500/10 p-4">
          <h3 className="text-sm font-semibold text-violet-100">Karsilastirma ozeti</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-200">{report.comparison_summary}</p>
          <p className="mt-3 text-xs text-slate-500">
            Motor: {report.models_used.join(' · ')}
          </p>
        </div>

        {report.warnings.length > 0 ? (
          <ul className="mt-3 space-y-1 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100">
            {report.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        ) : null}

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <InsightList
            title="Rakipte one cikanlar"
            items={report.competitor_strengths}
            accent="text-amber-200"
          />
          <InsightList title="Sizin guclu yanlar" items={report.your_strengths} accent="text-emerald-200" />
        </div>

        <div className="mt-4">
          <InsightList title="Sizin icin firsat / iyilestirme" items={report.your_gaps} accent="text-sky-200" />
        </div>

        <p className="mt-4 text-xs text-slate-500">{report.disclaimer}</p>
      </div>
    </div>
  );
}
