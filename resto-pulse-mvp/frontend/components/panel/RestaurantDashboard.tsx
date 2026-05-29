'use client';

import { FormEvent, useEffect, useState } from 'react';

import { usePanel } from '@/components/panel/PanelContext';
import { AiPricingOffers } from '@/components/panel/AiPricingOffers';
import { CompetitorAiReportView } from '@/components/panel/CompetitorAiReport';
import { addPanelCompetitor, analyzePanelCompetitor, getPanelDashboard, searchLivePlaces } from '@/lib/api';
import type { CompetitorAiReport, PanelDashboard } from '@/lib/types';

export function RestaurantDashboard() {
  const { userEmail, access } = usePanel();
  const [data, setData] = useState<PanelDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [competitorQuery, setCompetitorQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [aiReport, setAiReport] = useState<CompetitorAiReport | null>(null);

  useEffect(() => {
    if (!userEmail || !access?.can_access_panel) return;
    setLoading(true);
    getPanelDashboard(userEmail)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Dashboard yuklenemedi'))
      .finally(() => setLoading(false));
  }, [userEmail, access?.can_access_panel]);

  async function onAnalyzeCompetitor(competitorId: string) {
    if (!userEmail) return;
    setAnalyzingId(competitorId);
    setError(null);
    try {
      const report = await analyzePanelCompetitor(userEmail, competitorId);
      setAiReport(report);
      const refreshed = await getPanelDashboard(userEmail);
      setData(refreshed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI analizi basarisiz');
    } finally {
      setAnalyzingId(null);
    }
  }

  async function onAddCompetitor(event: FormEvent) {
    event.preventDefault();
    if (!userEmail || !competitorQuery.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const search = await searchLivePlaces({ q: competitorQuery.trim(), city: 'Bursa', limit: 1 });
      const place = search.items[0];
      if (!place) {
        setError('Rakip bulunamadi');
        return;
      }
      await addPanelCompetitor({
        user_email: userEmail,
        place_id: place.place_id,
        name: place.name,
      });
      const refreshed = await getPanelDashboard(userEmail);
      setData(refreshed);
      setCompetitorQuery('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rakip eklenemedi');
    } finally {
      setAdding(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-400">Dashboard yukleniyor...</p>;
  if (error && !data) {
    return <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-100">{error}</div>;
  }
  if (!data) return null;

  const { summary, ratings, competitors, ai_insight, ai_quota, ai_pricing } = data;

  function refreshQuota(next: typeof ai_quota) {
    setData((prev) => (prev ? { ...prev, ai_quota: next } : prev));
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Harita tik (hafta)" value={summary.maps_clicks_week} />
        <StatCard label="Profil goruntuleme (hafta)" value={summary.profile_views_week} />
        <StatCard label="Google puan" value={ratings.google_rating?.toFixed(1) ?? '-'} />
        <StatCard label="Acik sikayet" value={summary.open_feedback_count} />
      </div>

      <section className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-5">
        <h2 className="text-lg font-semibold text-white">Puan Ozeti</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <p className="text-sm text-slate-300">
            Google: {ratings.google_rating ?? '-'} · {ratings.google_review_count ?? 0} yorum
          </p>
          <p className="text-sm text-slate-300">
            GastroSkor: {ratings.gastro_avg_rating ?? '-'} · {ratings.gastro_review_count} yorum
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-5">
        <h2 className="text-lg font-semibold text-white">AI Ozeti</h2>
        <p className="mt-2 text-sm text-slate-300">{ai_insight}</p>
        <p className="mt-3 text-xs text-violet-300">{ai_quota.plan_label}</p>
        <p className="mt-1 text-xs text-slate-300">{ai_quota.message}</p>
        {ai_quota.extra_credits > 0 ? (
          <p className="mt-1 text-xs text-emerald-300">
            Ekstra hak: {ai_quota.extra_credits}
            {ai_quota.will_use_extra_credit ? ' (siradaki analiz bunu kullanir)' : ''}
          </p>
        ) : null}
        {!ai_quota.scheduled_available && ai_quota.next_analysis_at ? (
          <p className="mt-1 text-xs text-slate-400">
            Planli sonraki: {new Date(ai_quota.next_analysis_at).toLocaleDateString('tr-TR')}
          </p>
        ) : null}
        {userEmail && ai_pricing ? (
          <AiPricingOffers
            userEmail={userEmail}
            quota={ai_quota}
            pricing={ai_pricing}
            onUpdated={refreshQuota}
          />
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">Rakipler</h2>
          <p className="text-xs text-slate-400">
            Limit: {access?.competitor_limit ?? 0} · Trial: 1, ucretli: 5
          </p>
        </div>
        <ul className="mt-3 space-y-2">
          {competitors.length === 0 ? (
            <li className="text-sm text-slate-400">Henuz rakip eklemediniz.</li>
          ) : (
            competitors.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200">
                <span>
                  {row.name} · Google {row.rating ?? '-'} · {row.review_count ?? 0} yorum
                </span>
                <button
                  type="button"
                  onClick={() => void onAnalyzeCompetitor(row.id)}
                  disabled={analyzingId === row.id || !ai_quota.can_run}
                  title={!ai_quota.can_run ? ai_quota.message : undefined}
                  className="rounded-lg bg-violet-600 px-3 py-1 text-xs font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50">
                  {analyzingId === row.id
                    ? 'Analiz...'
                    : ai_quota.can_run
                      ? ai_quota.will_use_extra_credit
                        ? 'Analiz (ekstra hak)'
                        : 'Rakip Analizi (AI)'
                      : `${ai_quota.days_until_next ?? '?'} gun`}
                </button>
              </li>
            ))
          )}
        </ul>
        {(competitors.length < (access?.competitor_limit ?? 0)) ? (
          <form onSubmit={onAddCompetitor} className="mt-4 flex gap-2">
            <input
              value={competitorQuery}
              onChange={(e) => setCompetitorQuery(e.target.value)}
              placeholder="Rakip ara: Haci Dayi Kebap"
              className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
            <button
              type="submit"
              disabled={adding}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950">
              Ekle
            </button>
          </form>
        ) : null}
      </section>

      {!access?.can_write_actions ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          Mesaj ve kupon icin tam panel gerekir (SMS dogrulama veya ziyaret sonrasi).
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div>
      ) : null}

      {aiReport ? <CompetitorAiReportView report={aiReport} onClose={() => setAiReport(null)} /> : null}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-700/70 bg-slate-950/70 p-4">
      <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}
