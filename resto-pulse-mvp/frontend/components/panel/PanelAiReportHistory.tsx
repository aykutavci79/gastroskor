'use client';

import { useEffect, useState } from 'react';

import { getPanelAiReportDetail, getPanelAiReportTrend } from '@/lib/api';
import type { AiReportTrend, StoredAiReport } from '@/lib/types';

type Props = {
  userEmail: string;
  reports: StoredAiReport[];
  onRefresh?: () => void;
};

function formatReportDate(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function StoredReportModal({ report, onClose }: { report: StoredAiReport; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-surface-input p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-violet-300">Kayitli AI raporu</p>
            <h2 className="text-xl font-semibold text-content">{formatReportDate(report.created_at)}</h2>
            <p className="mt-1 text-xs text-content-muted">Rakip: {report.competitor_name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-3 py-1 text-sm text-content-muted hover:bg-surface-input">
            Kapat
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-violet-500/30 bg-violet-500/10 p-4">
          <p className="text-sm leading-relaxed text-content">{report.comparison_summary}</p>
        </div>

        {report.your_gaps.length > 0 ? (
          <div className="mt-4 rounded-xl border border-border/70 bg-surface-card p-4">
            <h3 className="text-sm font-semibold text-sky-200">Iyilestirme onerileri</h3>
            <ul className="mt-2 space-y-2 text-sm text-content">
              {report.your_gaps.map((row, idx) => (
                <li key={idx}>
                  <span className="text-xs uppercase text-content-muted">{row.category}</span>
                  <p>{row.summary}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {report.your_strengths.length > 0 ? (
          <div className="mt-4 rounded-xl border border-border/70 bg-surface-card p-4">
            <h3 className="text-sm font-semibold text-success">Guclu yanlar</h3>
            <ul className="mt-2 space-y-2 text-sm text-content">
              {report.your_strengths.map((row, idx) => (
                <li key={idx}>{row.summary}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="mt-4 text-xs text-content-muted">
          Ozet rapor; ham Google yorumu veya musteri bilgisi saklanmaz.
        </p>
      </div>
    </div>
  );
}

export function PanelAiReportHistory({ userEmail, reports, onRefresh }: Props) {
  const [trend, setTrend] = useState<AiReportTrend | null>(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const [selected, setSelected] = useState<StoredAiReport | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!userEmail || reports.length < 2) {
      setTrend(null);
      return;
    }
    setTrendLoading(true);
    getPanelAiReportTrend(userEmail)
      .then(setTrend)
      .catch(() => setTrend(null))
      .finally(() => setTrendLoading(false));
  }, [userEmail, reports.length, reports[0]?.id]);

  async function openReport(reportId: string) {
    setLoadingId(reportId);
    try {
      const detail = await getPanelAiReportDetail(userEmail, reportId);
      setSelected(detail);
    } finally {
      setLoadingId(null);
    }
  }

  if (reports.length === 0) {
    return (
      <section className="rounded-2xl border border-border/70 bg-surface-input p-5">
        <h2 className="text-lg font-semibold text-content">AI Rapor Gecmisi</h2>
        <p className="mt-2 text-sm text-content-muted">
          Ilk rakip analizinizden sonra ozet raporlar burada listelenir (ham yorum saklanmaz).
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border/70 bg-surface-input p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-content">AI Rapor Gecmisi</h2>
        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            className="text-xs text-brand-gold hover:underline">
            Listeyi yenile
          </button>
        ) : null}
      </div>

      {trendLoading ? (
        <p className="mt-3 text-sm text-content-muted">Gelisim ozeti hazirlaniyor...</p>
      ) : trend?.available && trend.summary ? (
        <div className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4">
          <p className="text-xs uppercase tracking-wider text-emerald-200">Son {trend.report_count} analiz trendi</p>
          {trend.period_from && trend.period_to ? (
            <p className="mt-1 text-xs text-content-muted">
              {trend.period_from} — {trend.period_to}
            </p>
          ) : null}
          <p className="mt-2 text-sm leading-relaxed text-content">{trend.summary}</p>
          {trend.improvements && trend.improvements.length > 0 ? (
            <ul className="mt-3 space-y-1 text-xs text-success">
              {trend.improvements.map((row, idx) => (
                <li key={`imp-${idx}`}>✓ {row.summary}</li>
              ))}
            </ul>
          ) : null}
          {trend.new_concerns && trend.new_concerns.length > 0 ? (
            <ul className="mt-2 space-y-1 text-xs text-amber-100">
              {trend.new_concerns.map((row, idx) => (
                <li key={`con-${idx}`}>⚠ {row.summary}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : trend?.message ? (
        <p className="mt-3 text-sm text-content-muted">{trend.message}</p>
      ) : null}

      <ul className="mt-4 space-y-2">
        {reports.map((row) => (
          <li
            key={row.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface/70 px-3 py-2 text-sm">
            <div>
              <p className="font-medium text-content">
                {formatReportDate(row.created_at)} raporu
                {row.report_source === 'google_business' ? (
                  <span className="ml-2 rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] uppercase text-emerald-200">
                    Google tam
                  </span>
                ) : (
                  <span className="ml-2 rounded bg-violet-500/20 px-2 py-0.5 text-[10px] uppercase text-violet-200">
                    Rakip
                  </span>
                )}
              </p>
              <p className="text-xs text-content-muted">
                {row.report_source === 'google_business'
                  ? `Isletme · ${row.reviews_total ?? '?'} yorum havuzu`
                  : `Rakip: ${row.competitor_name}`}
              </p>
            </div>
            <button
              type="button"
              disabled={loadingId === row.id}
              onClick={() => void openReport(row.id)}
              className="rounded-lg border border-border px-3 py-1 text-xs text-content hover:bg-surface-input disabled:opacity-50">
              {loadingId === row.id ? '...' : 'Goruntule'}
            </button>
          </li>
        ))}
      </ul>

      {selected ? <StoredReportModal report={selected} onClose={() => setSelected(null)} /> : null}
    </section>
  );
}
