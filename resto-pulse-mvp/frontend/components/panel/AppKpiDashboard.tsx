'use client';

import { useEffect, useState } from 'react';

type MetricsTotals = {
  unique_users: number;
  sessions: number;
  web_visitors: number;
  web_sessions: number;
  mobile_visitors: number;
  mobile_sessions: number;
  avg_session_seconds: number | null;
  web_avg_session_seconds: number | null;
  mobile_avg_session_seconds: number | null;
  logins: number;
  live_searches: number;
  reviews: number;
  total_registered_users: number;
};

type DailyRow = {
  date: string;
  unique_users: number;
  sessions: number;
  web_visitors: number;
  web_sessions: number;
  mobile_visitors: number;
  mobile_sessions: number;
  avg_session_seconds: number | null;
  web_avg_session_seconds: number | null;
  mobile_avg_session_seconds: number | null;
  logins: number;
  live_searches: number;
  reviews: number;
};

type MetricsSummary = {
  period_days: number;
  totals: MetricsTotals;
  daily: DailyRow[];
};

type PlaceCatalogStats = {
  total_places: number;
  total_seen_events: number;
  linked_restaurants: number;
  by_city: { city: string; count: number }[];
  top_queries: { query: string; count: number }[];
  search_performance: {
    period_days: number;
    total_live_searches: number;
    tracked_searches: number;
    file_cache_hits: number;
    google_api_calls: number;
    google_free_searches: number;
    file_cache_hit_rate_pct: number | null;
    google_free_rate_pct: number | null;
    by_source: { source: string; count: number }[];
    top_query_groups: { query: string; count: number }[];
  };
  recent_places: {
    name: string;
    city: string;
    rating: number | null;
    seen_count: number;
    last_source_query: string | null;
    last_seen_at: string;
  }[];
};

function formatDuration(seconds: number | null): string {
  if (seconds == null || Number.isNaN(seconds)) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m <= 0) return `${s} sn`;
  return `${m} dk ${s} sn`;
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

export function AppKpiDashboard() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [days, setDays] = useState(30);
  const [data, setData] = useState<MetricsSummary | null>(null);
  const [catalog, setCatalog] = useState<PlaceCatalogStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [sendingReport, setSendingReport] = useState(false);
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/panel/admin/status')
      .then((r) => r.json())
      .then((res: { is_panel_admin?: boolean }) => setAllowed(Boolean(res.is_panel_admin)))
      .catch(() => setAllowed(false));
  }, []);

  useEffect(() => {
    if (!allowed) return;
    setLoading(true);
    setError(null);
    fetch(`/api/panel/admin/kpi?days=${days}`)
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) {
          throw new Error(typeof json.detail === 'string' ? json.detail : 'KPI yuklenemedi');
        }
        setData(json as MetricsSummary);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'KPI yuklenemedi');
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [allowed, days]);

  useEffect(() => {
    if (!allowed) return;
    setCatalogLoading(true);
    fetch(`/api/panel/admin/place-catalog?days=${days}`)
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) {
          throw new Error(typeof json.detail === 'string' ? json.detail : 'Place catalog yuklenemedi');
        }
        setCatalog(json as PlaceCatalogStats);
      })
      .catch(() => setCatalog(null))
      .finally(() => setCatalogLoading(false));
  }, [allowed, days]);

  async function sendDailyReportNow() {
    setSendingReport(true);
    setReportMessage(null);
    setError(null);
    try {
      const res = await fetch('/api/panel/admin/kpi/send-report', { method: 'POST' });
      const json = (await res.json()) as {
        detail?: string;
        ok?: boolean;
        result?: { sent?: number; recipients?: number; errors?: string[] | null; reason?: string };
      };
      if (!res.ok) {
        throw new Error(typeof json.detail === 'string' ? json.detail : 'Mail gonderilemedi');
      }
      const sent = json.result?.sent ?? 0;
      const recipients = json.result?.recipients ?? 0;
      const errs = json.result?.errors?.filter(Boolean) ?? [];
      if (sent > 0) {
        setReportMessage(`Gunluk ozet maili gonderildi (${sent}/${recipients} alici). Spam klasorune de bak.`);
      } else if (json.result?.reason === 'no_recipients') {
        setError('Alici yok: Railway\'de METRICS_DAILY_REPORT_EMAILS veya PANEL_ADMIN_EMAILS tanimla.');
      } else if (errs.length) {
        setError(errs.join(' | '));
      } else {
        setError('Mail gonderilemedi — Railway SMTP ve EMAIL_PROVIDER=smtp ayarlarini kontrol et.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mail gonderilemedi');
    } finally {
      setSendingReport(false);
    }
  }

  if (allowed === null) {
    return <p className="text-sm text-content-muted">Yetki kontrol ediliyor...</p>;
  }

  if (!allowed) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-100">
        Bu sayfa sadece panel admin hesaplari icindir.
      </div>
    );
  }

  const totals = data?.totals;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-brand-gold/30 bg-brand-gold/5 p-6">
        <h1 className="text-xl font-semibold text-brand-gold">Uygulama KPI (pazarlama)</h1>
        <p className="mt-2 text-sm text-content-muted">
          Kendi sunucumuzda tutulan ziyaretci sayilari: web (gastroskor.com.tr) ve mobil (iOS/Android) ayri.
          Google Analytics zorunlu degil — panel sayfalari web sayacina dahil edilmez.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="text-sm text-content">
            Donem
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="ml-2 rounded-lg border border-border bg-surface px-2 py-1 text-content"
            >
              <option value={7}>7 gun</option>
              <option value={30}>30 gun</option>
              <option value={90}>90 gun</option>
            </select>
          </label>
          {loading ? <span className="text-xs text-content-muted">Yukleniyor...</span> : null}
          <button
            type="button"
            onClick={() => void sendDailyReportNow()}
            disabled={sendingReport}
            className="rounded-lg border border-brand-gold/50 bg-brand-gold/10 px-3 py-1.5 text-sm font-medium text-brand-gold hover:bg-brand-gold/20 disabled:opacity-50"
          >
            {sendingReport ? 'Gonderiliyor...' : 'Simdi mail gonder (test)'}
          </button>
        </div>
        {reportMessage ? <p className="mt-3 text-sm text-emerald-300">{reportMessage}</p> : null}
        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
      </section>

      {totals ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-sky-500/30 bg-sky-500/5 p-5">
              <p className="text-xs uppercase tracking-wide text-sky-200/80">Web ziyaretci</p>
              <p className="mt-2 text-3xl font-semibold text-content">{totals.web_visitors}</p>
              <p className="mt-2 text-sm text-content-muted">
                {totals.web_sessions} oturum · ort. {formatDuration(totals.web_avg_session_seconds)}
              </p>
            </div>
            <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-5">
              <p className="text-xs uppercase tracking-wide text-violet-200/80">Mobil ziyaretci</p>
              <p className="mt-2 text-3xl font-semibold text-content">{totals.mobile_visitors}</p>
              <p className="mt-2 text-sm text-content-muted">
                {totals.mobile_sessions} oturum · ort. {formatDuration(totals.mobile_avg_session_seconds)}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Toplam ziyaretci', value: totals.unique_users },
              { label: 'Toplam oturum', value: totals.sessions },
              { label: 'Ort. kalis suresi', value: formatDuration(totals.avg_session_seconds) },
              { label: 'Giris (sync)', value: totals.logins },
              { label: 'Canli arama', value: totals.live_searches },
              { label: 'Yorum', value: totals.reviews },
              { label: 'Kayitli kullanici', value: totals.total_registered_users },
            ].map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-border bg-surface/80 p-4"
            >
              <p className="text-xs uppercase tracking-wide text-content-muted">{card.label}</p>
              <p className="mt-2 text-2xl font-semibold text-content">{card.value}</p>
            </div>
          ))}
          </div>
        </>
      ) : null}

      <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6">
        <h2 className="text-lg font-semibold text-emerald-300">Google Place Catalog</h2>
        <p className="mt-2 text-sm text-content-muted">
          Canli aramalardan biriken kalici mekan havuzu. Google faturasini amorti etmek icin buradan takip et.
        </p>
        {catalogLoading ? <p className="mt-3 text-xs text-content-muted">Catalog yukleniyor...</p> : null}
        {catalog ? (
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: 'Toplam mekan', value: catalog.total_places },
                { label: 'Toplam gorulme', value: catalog.total_seen_events },
                {
                  label: 'Panel uyesi eslesmesi',
                  value: catalog.linked_restaurants,
                  hint: 'Google katalog kayitlarindan panelde kayitli restoranla eslesen (place_id)',
                },
                {
                  label: 'Sehir sayisi',
                  value: catalog.by_city.length,
                },
              ].map((card) => (
                <div key={card.label} className="rounded-2xl border border-border bg-surface/80 p-4">
                  <p className="text-xs uppercase tracking-wide text-content-muted">{card.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-content">{card.value}</p>
                  {'hint' in card && card.hint ? (
                    <p className="mt-1 text-[11px] leading-4 text-content-muted">{card.hint}</p>
                  ) : null}
                </div>
              ))}
            </div>

            {catalog.search_performance ? (
              <div className="rounded-2xl border border-border bg-surface/60 p-4">
                <p className="text-xs uppercase tracking-wide text-content-muted">
                  Arama performansi ({catalog.search_performance.period_days} gun)
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    {
                      label: "Google'siz oran",
                      value:
                        catalog.search_performance.google_free_rate_pct != null
                          ? `%${catalog.search_performance.google_free_rate_pct}`
                          : '—',
                    },
                    {
                      label: 'Dosya cache hit',
                      value:
                        catalog.search_performance.file_cache_hit_rate_pct != null
                          ? `%${catalog.search_performance.file_cache_hit_rate_pct}`
                          : '—',
                    },
                    {
                      label: 'Google API cagri',
                      value: catalog.search_performance.google_api_calls,
                    },
                    {
                      label: 'Izlenen arama',
                      value: `${catalog.search_performance.tracked_searches}/${catalog.search_performance.total_live_searches}`,
                    },
                  ].map((card) => (
                    <div key={card.label} className="rounded-xl border border-border/70 bg-surface/80 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-content-muted">{card.label}</p>
                      <p className="mt-1 text-xl font-semibold text-content">{card.value}</p>
                    </div>
                  ))}
                </div>
                {catalog.search_performance.tracked_searches === 0 ? (
                  <p className="mt-2 text-xs text-content-muted">
                    Deploy sonrasi yeni aramalardan itibaren dolar. Gecmis aramalarda kaynak bilgisi yok.
                  </p>
                ) : null}
                {catalog.search_performance.by_source.length ? (
                  <ul className="mt-3 flex flex-wrap gap-2 text-xs text-content-muted">
                    {catalog.search_performance.by_source.map((row) => (
                      <li key={row.source} className="rounded-full border border-border px-2 py-1">
                        {row.source}: {row.count}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {catalog.search_performance.top_query_groups.length ? (
                  <div className="mt-3">
                    <p className="text-[11px] uppercase tracking-wide text-content-muted">
                      En cok aranan (gruplanmis)
                    </p>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {catalog.search_performance.top_query_groups.map((row) => (
                        <li
                          key={row.query}
                          className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm text-content"
                        >
                          {row.query} <span className="text-content-muted">({row.count})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}

            {catalog.by_city.length ? (
              <div className="rounded-2xl border border-border bg-surface/60 p-4">
                <p className="text-xs uppercase tracking-wide text-content-muted">Sehir dagilimi</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {catalog.by_city.map((row) => (
                    <li
                      key={row.city}
                      className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm text-content"
                    >
                      {row.city} <span className="text-content-muted">({row.count})</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {catalog.top_queries.length ? (
              <div className="rounded-2xl border border-border bg-surface/60 p-4">
                <p className="text-xs uppercase tracking-wide text-content-muted">En cok aranan sorgular</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {catalog.top_queries.map((row) => (
                    <li
                      key={row.query}
                      className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm text-content"
                    >
                      {row.query} <span className="text-content-muted">({row.count})</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {catalog.recent_places.length ? (
              <div className="overflow-x-auto rounded-2xl border border-border">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-surface/90 text-xs uppercase text-content-muted">
                    <tr>
                      <th className="px-4 py-3">Mekan</th>
                      <th className="px-4 py-3">Sehir</th>
                      <th className="px-4 py-3">Puan</th>
                      <th className="px-4 py-3">Gorulme</th>
                      <th className="px-4 py-3">Son arama</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catalog.recent_places.map((row) => (
                      <tr key={`${row.name}-${row.last_seen_at}`} className="border-t border-border/60">
                        <td className="px-4 py-2 text-content">{row.name}</td>
                        <td className="px-4 py-2">{row.city}</td>
                        <td className="px-4 py-2">{row.rating ?? '—'}</td>
                        <td className="px-4 py-2">{row.seen_count}</td>
                        <td className="px-4 py-2 text-content-muted">{row.last_source_query ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-content-muted">Henuz catalog kaydi yok — deploy sonrasi arama yapinca dolacak.</p>
            )}
          </div>
        ) : null}
      </section>

      {data?.daily?.length ? (
        <section className="overflow-x-auto rounded-2xl border border-border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface/90 text-xs uppercase text-content-muted">
              <tr>
                <th className="px-4 py-3">Tarih</th>
                <th className="px-4 py-3">Web</th>
                <th className="px-4 py-3">Mobil</th>
                <th className="px-4 py-3">Toplam</th>
                <th className="px-4 py-3">Oturum</th>
                <th className="px-4 py-3">Ort. sure</th>
                <th className="px-4 py-3">Giris</th>
                <th className="px-4 py-3">Arama</th>
                <th className="px-4 py-3">Yorum</th>
              </tr>
            </thead>
            <tbody>
              {[...data.daily].reverse().map((row) => (
                <tr key={row.date} className="border-t border-border/60">
                  <td className="px-4 py-2 text-content">{formatDate(row.date)}</td>
                  <td className="px-4 py-2">{row.web_visitors}</td>
                  <td className="px-4 py-2">{row.mobile_visitors}</td>
                  <td className="px-4 py-2">{row.unique_users}</td>
                  <td className="px-4 py-2">{row.sessions}</td>
                  <td className="px-4 py-2">{formatDuration(row.avg_session_seconds)}</td>
                  <td className="px-4 py-2">{row.logins}</td>
                  <td className="px-4 py-2">{row.live_searches}</td>
                  <td className="px-4 py-2">{row.reviews}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}
