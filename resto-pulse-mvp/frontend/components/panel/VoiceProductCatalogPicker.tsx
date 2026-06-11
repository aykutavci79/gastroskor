'use client';

import { useEffect, useMemo, useState } from 'react';

import { getPanelVoiceMenuOfferings, getVoiceProductCatalog, syncPanelVoiceMenuOfferings } from '@/lib/api';
import type { VoiceMenuOfferingState, VoiceProductCatalogGroup } from '@/lib/types';

type RowState = {
  enabled: boolean;
  price: string;
};

type Props = {
  userEmail: string;
  subscriptionActive: boolean;
  onlineOrdersEnabled: boolean;
};

export function VoiceProductCatalogPicker({ userEmail, subscriptionActive, onlineOrdersEnabled }: Props) {
  const [groups, setGroups] = useState<VoiceProductCatalogGroup[]>([]);
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const productCount = useMemo(
    () => groups.reduce((sum, group) => sum + group.products.length, 0),
    [groups],
  );

  useEffect(() => {
    if (!onlineOrdersEnabled || !subscriptionActive) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const [catalog, offerings] = await Promise.all([
          getVoiceProductCatalog(),
          getPanelVoiceMenuOfferings(userEmail),
        ]);
        if (cancelled) return;
        setGroups(catalog.groups);
        const next: Record<string, RowState> = {};
        for (const item of offerings.items) {
          next[item.slug] = {
            enabled: item.enabled,
            price: item.price_tl != null ? String(item.price_tl) : '',
          };
        }
        setRows(next);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Sesli menu yuklenemedi');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userEmail, onlineOrdersEnabled, subscriptionActive]);

  function setRow(slug: string, patch: Partial<RowState>) {
    setRows((prev) => ({
      ...prev,
      [slug]: {
        enabled: prev[slug]?.enabled ?? false,
        price: prev[slug]?.price ?? '',
        ...patch,
      },
    }));
  }

  async function onSave() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const offerings = Object.entries(rows).map(([slug, row]) => ({
        slug,
        enabled: row.enabled,
        price_tl: row.enabled ? Number(row.price.replace(',', '.')) : null,
      }));
      const enabledRows = offerings.filter((row) => row.enabled);
      if (enabledRows.some((row) => !row.price_tl || Number.isNaN(row.price_tl) || row.price_tl <= 0)) {
        throw new Error('Isaretli her urun icin gecerli bir fiyat girin.');
      }
      const result = await syncPanelVoiceMenuOfferings({ user_email: userEmail, offerings });
      const next: Record<string, RowState> = {};
      for (const item of result.items) {
        next[item.slug] = {
          enabled: item.enabled,
          price: item.price_tl != null ? String(item.price_tl) : '',
        };
      }
      setRows(next);
      setMessage('Sesli siparis urunleri kaydedildi.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayit basarisiz');
    } finally {
      setSaving(false);
    }
  }

  if (!onlineOrdersEnabled) return null;

  return (
    <div className="rounded-xl border border-brand/25 bg-brand/5 p-4">
      <p className="text-sm font-semibold text-brand-gold">Sesli siparis urunleri</p>
      <p className="mt-1 text-xs text-content-muted">
        Musteri &quot;150 TL lahmacun&quot; veya &quot;cantik&quot; dediginde sistem bu listeden arar.
        Lahmacun ile acili lahmacun ayri urundur; kiyma ve kusbasi cantik da ayri urundur ama ikisi de
        &quot;cantik&quot; aramasinda cikar.
      </p>

      {loading ? <p className="mt-3 text-xs text-content-muted">Urun listesi yukleniyor...</p> : null}
      {error ? <p className="mt-3 text-xs text-rose-300">{error}</p> : null}
      {message ? <p className="mt-3 text-xs text-success">{message}</p> : null}

      {!loading ? (
        <div className="mt-4 space-y-4">
          {groups.map((group) => (
            <div key={group.search_group}>
              <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">
                {group.search_label}
                {group.products.length > 1 ? (
                  <span className="ml-2 font-normal normal-case text-content-muted/80">
                    (genel arama: {group.search_group})
                  </span>
                ) : null}
              </p>
              <div className="mt-2 space-y-2">
                {group.products.map((product) => {
                  const row = rows[product.slug] ?? { enabled: false, price: '' };
                  return (
                    <div
                      key={product.slug}
                      className="flex flex-wrap items-center gap-3 rounded-lg border border-border/70 bg-surface/50 px-3 py-2">
                      <label className="flex min-w-[180px] flex-1 items-center gap-2 text-sm text-content">
                        <input
                          type="checkbox"
                          checked={row.enabled}
                          disabled={!subscriptionActive || saving}
                          onChange={(e) => setRow(product.slug, { enabled: e.target.checked })}
                          className="rounded border-border"
                        />
                        <span>
                          <span className="font-medium">{product.label}</span>
                          {product.hint ? (
                            <span className="mt-0.5 block text-[10px] text-content-muted">{product.hint}</span>
                          ) : null}
                        </span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          step={1}
                          disabled={!subscriptionActive || saving || !row.enabled}
                          value={row.price}
                          onChange={(e) => setRow(product.slug, { price: e.target.value })}
                          placeholder="Fiyat"
                          className="w-24 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-content disabled:opacity-50"
                        />
                        <span className="text-xs text-content-muted">TL</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={!subscriptionActive || saving || productCount === 0}
              onClick={() => void onSave()}
              className="rounded-lg bg-brand-gold px-4 py-2 text-sm font-semibold text-surface disabled:opacity-50">
              {saving ? 'Kaydediliyor...' : 'Sesli urunleri kaydet'}
            </button>
            <p className="text-[11px] text-content-muted">
              Secili urunler musteri menusune de eklenir; sesli arama bu fiyatlari kullanir.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
