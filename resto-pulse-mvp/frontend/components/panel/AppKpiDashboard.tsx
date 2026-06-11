'use client';

import { useEffect, useState } from 'react';

type MetricsTotals = {
  unique_users: number;
  sessions: number;
  avg_session_seconds: number | null;
  logins: number;
  live_searches: number;
  reviews: number;
  total_registered_users: number;
};

type DailyRow = {
  date: string;
  unique_users: number;
  sessions: number;
  avg_session_seconds: number | null;
  logins: number;
  live_searches: number;
  reviews: number;
};

type MetricsSummary = {
  period_days: number;
  totals: MetricsTotals;
  daily: DailyRow[];
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
  const [loading, setLoading] = useState(false);
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
          Mobil oturum suresi, giris, canli arama ve yorumlar. Otomatik mail her gun ~08:00 (TR).
          Web sayfa goruntulemesi degil — API/mobil olaylari.
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Aktif kullanici (oturum)', value: totals.unique_users },
            { label: 'Oturum sayisi', value: totals.sessions },
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
      ) : null}

      {data?.daily?.length ? (
        <section className="overflow-x-auto rounded-2xl border border-border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface/90 text-xs uppercase text-content-muted">
              <tr>
                <th className="px-4 py-3">Tarih</th>
                <th className="px-4 py-3">Aktif</th>
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
