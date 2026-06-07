'use client';

import { FormEvent, useEffect, useState } from 'react';

import { usePanel } from '@/components/panel/PanelContext';
import { AiPricingOffers } from '@/components/panel/AiPricingOffers';
import { RestaurantMenuEditor } from '@/components/panel/RestaurantMenuEditor';
import { RestaurantPromoSettings } from '@/components/panel/RestaurantPromoSettings';
import { CompetitorAiReportView } from '@/components/panel/CompetitorAiReport';
import { PanelFollowerCoupons } from '@/components/panel/PanelFollowerCoupons';
import { PanelNotificationSettings } from '@/components/panel/PanelNotificationSettings';
import { PanelOrdersSection } from '@/components/panel/PanelOrdersSection';
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

  if (loading) return <p className="text-sm text-content-muted">Dashboard yukleniyor...</p>;
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

      <section className="rounded-2xl border border-border/70 bg-surface-input p-5">
        <h2 className="text-lg font-semibold text-content">Puan Ozeti</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <p className="text-sm text-content-muted">
            Google: {ratings.google_rating ?? '-'} · {ratings.google_review_count ?? 0} yorum
          </p>
          <p className="text-sm text-content-muted">
            GastroSkor: {ratings.gastro_avg_rating ?? '-'} · {ratings.gastro_review_count} yorum
          </p>
        </div>
      </section>

      {userEmail ? (
        <>
          <RestaurantPromoSettings
            userEmail={userEmail}
            subscriptionActive={
              access?.subscription_status === 'trial' || access?.subscription_status === 'active'
            }
          />
          <RestaurantMenuEditor
            userEmail={userEmail}
            subscriptionActive={
              access?.subscription_status === 'trial' || access?.subscription_status === 'active'
            }
          />
          <PanelOrdersSection userEmail={userEmail} />
          <PanelFollowerCoupons userEmail={userEmail} canWrite={Boolean(access?.can_write_actions)} />
        </>
      ) : null}

      <section className="rounded-2xl border border-border/70 bg-surface-input p-5">
        <h2 className="text-lg font-semibold text-content">AI Ozeti</h2>
        <p className="mt-2 text-sm text-content-muted">{ai_insight}</p>
        <p className="mt-3 text-xs text-violet-300">{ai_quota.plan_label}</p>
        <p className="mt-1 text-xs text-content-muted">{ai_quota.message}</p>
        {ai_quota.extra_credits > 0 ? (
          <p className="mt-1 text-xs text-success">
            Ekstra hak: {ai_quota.extra_credits}
            {ai_quota.will_use_extra_credit ? ' (siradaki analiz bunu kullanir)' : ''}
          </p>
        ) : null}
        {!ai_quota.scheduled_available && ai_quota.next_analysis_at ? (
          <p className="mt-1 text-xs text-content-muted">
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

      <section id="competitors" className="scroll-mt-24 rounded-2xl border border-border/70 bg-surface-input p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-content">Rakipler</h2>
          <p className="text-xs text-content-muted">
            Limit: {access?.competitor_limit ?? 0} · Trial: 1, ucretli: 5
          </p>
        </div>
        <ul className="mt-3 space-y-2">
          {competitors.length === 0 ? (
            <li className="text-sm text-content-muted">Henuz rakip eklemediniz.</li>
          ) : (
            competitors.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface/70 px-3 py-2 text-sm text-content">
                <span>
                  {row.name} · Google {row.rating ?? '-'} · {row.review_count ?? 0} yorum
                </span>
                <button
                  type="button"
                  onClick={() => void onAnalyzeCompetitor(row.id)}
                  disabled={analyzingId === row.id || !ai_quota.can_run}
                  title={!ai_quota.can_run ? ai_quota.message : undefined}
                  className="rounded-lg bg-violet-600 px-3 py-1 text-xs font-semibold text-content hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50">
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
              className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-content"
            />
            <button
              type="submit"
              disabled={adding}
              className="btn-primary btn-sm">
              Ekle
            </button>
          </form>
        ) : null}
      </section>

      {!access?.can_write_actions ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-brand-gold">
          Mesaj ve kupon icin tam panel gerekir (SMS dogrulama veya ziyaret sonrasi).
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div>
      ) : null}

      {userEmail ? <PanelNotificationSettings userEmail={userEmail} /> : null}

      {aiReport ? <CompetitorAiReportView report={aiReport} onClose={() => setAiReport(null)} /> : null}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-surface/80 p-4">
      <p className="text-xs uppercase tracking-wider text-content-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-content">{value}</p>
    </div>
  );
}
