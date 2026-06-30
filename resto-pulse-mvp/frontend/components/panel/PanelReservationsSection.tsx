'use client';

import { useCallback, useEffect, useState } from 'react';

import { FloorPlanEditor } from '@/components/panel/FloorPlanEditor';
import {
  applyPanelReservationVitrin,
  decidePanelReservation,
  getPanelPromo,
  getPanelReservationVitrin,
  listPanelReservations,
  updatePanelPromo,
} from '@/lib/api';
import type { ReservationVitrinState, TableReservationRead } from '@/lib/types';

type Props = {
  userEmail: string;
  subscriptionActive: boolean;
};

const POLL_MS = 15_000;

function formatWhen(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusLabel(status: TableReservationRead['status']): string {
  if (status === 'pending_restaurant') return 'Onay bekliyor';
  if (status === 'approved_by_restaurant') return 'Musteri onayi bekliyor';
  if (status === 'confirmed') return 'Kesinlesti';
  if (status === 'rejected') return 'Reddedildi';
  if (status === 'expired') return 'Suresi doldu';
  return status;
}

function vitrinStatusLabel(status: string): string {
  if (status === 'approved') return 'Vitrinde yayinda';
  if (status === 'pending') return 'Incelemede';
  if (status === 'rejected') return 'Reddedildi';
  if (status === 'suspended') return 'Askida';
  return 'Basvuru yapilmadi';
}

export function PanelReservationsSection({ userEmail, subscriptionActive }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [hasOwnCourier, setHasOwnCourier] = useState(false);
  const [maxPartySize, setMaxPartySize] = useState(10);
  const [vitrin, setVitrin] = useState<ReservationVitrinState | null>(null);
  const [vitrinBusy, setVitrinBusy] = useState(false);
  const [savingMaxParty, setSavingMaxParty] = useState(false);
  const [items, setItems] = useState<TableReservationRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectText, setRejectText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [promo, reservations, vitrinState] = await Promise.all([
        getPanelPromo(userEmail),
        listPanelReservations(userEmail),
        getPanelReservationVitrin(userEmail),
      ]);
      setEnabled(Boolean(promo.online_reservations_enabled));
      setHasOwnCourier(Boolean(promo.has_own_courier));
      setMaxPartySize(promo.online_reservation_max_party_size ?? 10);
      setItems(reservations.items);
      setVitrin(vitrinState);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rezervasyonlar yuklenemedi');
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  async function toggleEnabled(next: boolean) {
    setError(null);
    try {
      await updatePanelPromo({
        user_email: userEmail,
        has_own_courier: hasOwnCourier,
        online_reservations_enabled: next,
      });
      setEnabled(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ayar kaydedilemedi');
    }
  }

  async function saveMaxPartySize(raw: number) {
    const next = Math.max(1, Math.min(100, Math.round(raw) || 10));
    setMaxPartySize(next);
    if (!subscriptionActive) return;
    setSavingMaxParty(true);
    setError(null);
    try {
      await updatePanelPromo({
        user_email: userEmail,
        has_own_courier: hasOwnCourier,
        online_reservation_max_party_size: next,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Limit kaydedilemedi');
    } finally {
      setSavingMaxParty(false);
    }
  }

  async function onDecision(id: string, decision: 'approved' | 'rejected') {
    setBusyId(id);
    setError(null);
    try {
      await decidePanelReservation(id, {
        user_email: userEmail,
        decision,
        reject_reason_text: decision === 'rejected' ? rejectText.trim() || null : null,
      });
      setRejectId(null);
      setRejectText('');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Islem basarisiz');
    } finally {
      setBusyId(null);
    }
  }

  async function onApplyVitrin() {
    setVitrinBusy(true);
    setError(null);
    try {
      const next = await applyPanelReservationVitrin(userEmail);
      setVitrin(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Vitrin basvurusu gonderilemedi');
    } finally {
      setVitrinBusy(false);
    }
  }

  const pending = items.filter((row) => row.status === 'pending_restaurant');

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border/70 bg-surface-input p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-content">Online rezervasyon</h2>
            <p className="mt-1 text-sm text-content-muted">
              Cift onay: siz onaylarsiniz, musteri push ile 24 saat icinde kesinlestirir.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-content">
            <input
              type="checkbox"
              checked={enabled}
              disabled={!subscriptionActive}
              onChange={(e) => void toggleEnabled(e.target.checked)}
            />
            Online rezervasyon acik
          </label>
        </div>
        <div className="mt-4 max-w-sm">
          <label className="block text-sm font-medium text-content">
            Uygulama uzerinden en fazla kisi
          </label>
          <p className="mt-1 text-xs text-content-muted">
            Bu sayinin uzerindeki gruplar uygulamadan rezervasyon yapamaz; restoranla dogrudan
            gorusmeleri istenir.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={100}
              value={maxPartySize}
              disabled={!subscriptionActive || savingMaxParty}
              onChange={(e) => setMaxPartySize(Number(e.target.value) || 1)}
              onBlur={() => void saveMaxPartySize(maxPartySize)}
              className="w-24 rounded-lg border border-border/70 bg-surface-card px-3 py-2 text-sm text-content"
            />
            <span className="text-sm text-content-muted">kisi</span>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-violet-100">Rezervasyon vitrini</h2>
            <p className="mt-1 text-sm text-content-muted">
              Uygulamadaki &quot;Online Rezervasyon&quot; listesinde gorunmek icin basvuru gerekir.
              Panelden rezervasyon acik olsa bile vitrin onayi olmadan herkese acik listede cikmazsiniz.
            </p>
          </div>
          {vitrin ? (
            <span className="rounded-full border border-violet-400/40 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-100">
              {vitrinStatusLabel(vitrin.status)}
            </span>
          ) : null}
        </div>

        {vitrin ? (
          <div className="mt-4 space-y-3 text-sm">
            <p className="text-content-muted">
              Salon: {vitrin.table_count} masa · {vitrin.seat_capacity} kisi kapasitesi
            </p>
            {vitrin.reject_reason ? (
              <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-rose-100">
                {vitrin.reject_reason}
              </p>
            ) : null}
            <ul className="space-y-2">
              {vitrin.checklist.map((item) => (
                <li
                  key={item.code}
                  className={`rounded-lg border px-3 py-2 ${
                    item.passed
                      ? 'border-emerald-500/30 bg-emerald-500/5 text-content'
                      : 'border-amber-500/30 bg-amber-500/5 text-content'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{item.label}</span>
                    <span className="text-xs">{item.passed ? 'Tamam' : 'Eksik'}</span>
                  </div>
                  <p className="mt-1 text-xs text-content-muted">{item.detail}</p>
                </li>
              ))}
            </ul>
            {vitrin.can_apply && enabled && subscriptionActive ? (
              <button
                type="button"
                disabled={vitrinBusy}
                onClick={() => void onApplyVitrin()}
                className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {vitrinBusy ? 'Gonderiliyor...' : 'Vitrin basvurusu gonder'}
              </button>
            ) : null}
            {!enabled ? (
              <p className="text-xs text-content-muted">Once online rezervasyonu acin.</p>
            ) : null}
          </div>
        ) : loading ? (
          <p className="mt-3 text-sm text-content-muted">Vitrin durumu yukleniyor...</p>
        ) : null}
      </section>

      <FloorPlanEditor userEmail={userEmail} subscriptionActive={subscriptionActive} />

      <section className="rounded-2xl border border-border/70 bg-surface-input p-5">
        <h2 className="text-lg font-semibold text-content">Rezervasyonlar</h2>
        {loading ? <p className="mt-2 text-sm text-content-muted">Yukleniyor...</p> : null}
        {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}

        {pending.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {pending.map((row) => (
              <li
                key={row.id}
                className="rounded-xl border border-brand-gold/30 bg-surface-card p-4 ring-1 ring-brand-gold/20"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {row.occasion_label ? (
                      <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-200">
                        {row.occasion_label}
                      </span>
                    ) : null}
                    <strong className="text-content">
                      {row.zone_label} · {row.table_label} · {row.party_size} kisi
                    </strong>
                  </div>
                  <span className="text-xs text-content-muted">{formatWhen(row.reserved_at)}</span>
                </div>
                <p className="mt-1 text-sm text-content-muted">
                  {row.customer_name || 'Musteri'} · {row.customer_phone}
                </p>
                {row.note ? <p className="mt-2 text-sm text-content">Ek not: {row.note}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busyId === row.id}
                    onClick={() => void onDecision(row.id, 'approved')}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    Onayla
                  </button>
                  <button
                    type="button"
                    disabled={busyId === row.id}
                    onClick={() => setRejectId(rejectId === row.id ? null : row.id)}
                    className="rounded-lg border border-rose-500/40 px-3 py-1.5 text-sm text-rose-200 hover:bg-rose-500/10 disabled:opacity-50"
                  >
                    Reddet
                  </button>
                </div>
                {rejectId === row.id ? (
                  <div className="mt-3 space-y-2">
                    <input
                      value={rejectText}
                      onChange={(e) => setRejectText(e.target.value)}
                      placeholder="Red nedeni (istege bagli)"
                      className="w-full rounded border border-border bg-surface-input px-3 py-2 text-sm text-content"
                    />
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => void onDecision(row.id, 'rejected')}
                      className="rounded-lg bg-rose-700 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                    >
                      Reddi gonder
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-content-muted">Bekleyen rezervasyon yok.</p>
        )}

        {items.filter((r) => r.status !== 'pending_restaurant').length > 0 ? (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-content-muted">Gecmis / diger</h3>
            <ul className="mt-2 space-y-2">
              {items
                .filter((r) => r.status !== 'pending_restaurant')
                .map((row) => (
                  <li key={row.id} className="rounded-lg border border-border bg-surface-card px-3 py-2 text-sm">
                    <span className="text-content">
                      {row.zone_label} {row.table_label} · {row.party_size} kisi
                    </span>
                    <span className="mx-2 text-content-muted">·</span>
                    <span className="text-content-muted">{statusLabel(row.status)}</span>
                    <span className="mx-2 text-content-muted">·</span>
                    <span className="text-content-muted">{formatWhen(row.reserved_at)}</span>
                  </li>
                ))}
            </ul>
          </div>
        ) : null}
      </section>
    </div>
  );
}
