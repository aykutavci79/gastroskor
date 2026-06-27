'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  getPanelFloorPlan,
  publishPanelFloorPlan,
  savePanelFloorPlan,
} from '@/lib/api';
import type { FloorPlanLayout, FloorPlanRead, FloorPlanTable, FloorPlanPoi } from '@/lib/types';

type Props = {
  userEmail: string;
  subscriptionActive: boolean;
};

const ZONE_OPTIONS = [
  { value: 'salon', label: 'Salon' },
  { value: 'bahce', label: 'Bahce' },
  { value: 'teras', label: 'Teras' },
] as const;

const POI_OPTIONS = [
  { value: 'entrance', label: 'Giris' },
  { value: 'live_music', label: 'Canli muzik' },
  { value: 'bar', label: 'Bar' },
  { value: 'other', label: 'Diger' },
] as const;

function newTableId() {
  return `t-${Date.now().toString(36)}`;
}

function newPoiId() {
  return `p-${Date.now().toString(36)}`;
}

function emptyLayout(): FloorPlanLayout {
  return { version: 1, tables: [], pois: [] };
}

function normalizeLayout(raw: FloorPlanLayout | null | undefined): FloorPlanLayout {
  if (!raw || typeof raw !== 'object') return emptyLayout();
  return {
    version: 1,
    tables: Array.isArray(raw.tables) ? raw.tables : [],
    pois: Array.isArray(raw.pois) ? raw.pois : [],
  };
}

export function FloorPlanEditor({ userEmail, subscriptionActive }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [plan, setPlan] = useState<FloorPlanRead | null>(null);
  const [layout, setLayout] = useState<FloorPlanLayout>(emptyLayout());
  const [backgroundUrl, setBackgroundUrl] = useState('');
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getPanelFloorPlan(userEmail)
      .then((data) => {
        setPlan(data);
        setLayout(normalizeLayout(data.layout as FloorPlanLayout));
        setBackgroundUrl(data.background_url ?? '');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Plan yuklenemedi'))
      .finally(() => setLoading(false));
  }, [userEmail]);

  const selectedTable = layout.tables.find((t) => t.id === selectedTableId) ?? null;

  const pointerToNorm = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0.5, y: 0.5 };
    const rect = svg.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    return { x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000 };
  }, []);

  function updateTable(id: string, patch: Partial<FloorPlanTable>) {
    setLayout((prev) => ({
      ...prev,
      tables: prev.tables.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    }));
  }

  function addTableAt(x: number, y: number) {
    const id = newTableId();
    const next: FloorPlanTable = {
      id,
      zone: 'salon',
      label: `M${layout.tables.length + 1}`,
      seats_min: 2,
      seats_max: 4,
      x,
      y,
    };
    setLayout((prev) => ({ ...prev, tables: [...prev.tables, next] }));
    setSelectedTableId(id);
  }

  function addPoiAt(x: number, y: number) {
    const next: FloorPlanPoi = {
      id: newPoiId(),
      kind: 'entrance',
      label: 'Giris',
      x,
      y,
    };
    setLayout((prev) => ({ ...prev, pois: [...prev.pois, next] }));
  }

  function removeSelected() {
    if (!selectedTableId) return;
    setLayout((prev) => ({
      ...prev,
      tables: prev.tables.filter((t) => t.id !== selectedTableId),
    }));
    setSelectedTableId(null);
  }

  async function onSaveDraft() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const saved = await savePanelFloorPlan(userEmail, {
        layout,
        background_url: backgroundUrl.trim() || null,
      });
      setPlan(saved);
      setLayout(normalizeLayout(saved.layout as FloorPlanLayout));
      setMessage('Taslak kaydedildi.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayit basarisiz');
    } finally {
      setSaving(false);
    }
  }

  async function onPublish() {
    setPublishing(true);
    setError(null);
    setMessage(null);
    try {
      await onSaveDraft();
      const published = await publishPanelFloorPlan(userEmail);
      setPlan(published);
      setMessage('Salon plani yayinlandi — musteriler masa secebilir.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yayin basarisiz');
    } finally {
      setPublishing(false);
    }
  }

  if (loading) return <p className="text-sm text-content-muted">Salon plani yukleniyor...</p>;

  return (
    <section className="rounded-2xl border border-border/70 bg-surface-input p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-content">Salon plani</h2>
          <p className="mt-1 text-sm text-content-muted">
            Kroki uzerine masa ve isaret noktalari (giris, canli muzik) ekleyin. Yayinladiktan sonra
            musteriler masayi secer.
          </p>
          {plan?.has_published ? (
            <p className="mt-1 text-xs text-success">
              Yayinda
              {plan.published_at
                ? ` · ${new Date(plan.published_at).toLocaleString('tr-TR')}`
                : null}
            </p>
          ) : (
            <p className="mt-1 text-xs text-amber-300">Henuz yayinlanmadi.</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!subscriptionActive || saving}
            onClick={() => void onSaveDraft()}
            className="rounded-lg border border-border px-3 py-2 text-sm text-content hover:bg-surface-card disabled:opacity-50"
          >
            {saving ? 'Kaydediliyor...' : 'Taslak kaydet'}
          </button>
          <button
            type="button"
            disabled={!subscriptionActive || publishing}
            onClick={() => void onPublish()}
            className="rounded-lg bg-brand-gold px-3 py-2 text-sm font-medium text-brand-dark hover:opacity-90 disabled:opacity-50"
          >
            {publishing ? 'Yayinlaniyor...' : 'Yayinla'}
          </button>
        </div>
      </div>

      <label className="mt-4 block text-sm text-content-muted">
        Arka plan gorsel URL (restoran fotosu / kroki)
        <input
          value={backgroundUrl}
          onChange={(e) => setBackgroundUrl(e.target.value)}
          placeholder="https://..."
          className="mt-1 w-full rounded-lg border border-border bg-surface-card px-3 py-2 text-sm text-content"
        />
      </label>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_240px]">
        <div className="relative overflow-hidden rounded-xl border border-border bg-surface-card">
          {backgroundUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={backgroundUrl}
              alt=""
              className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-40"
            />
          ) : null}
          <svg
            ref={svgRef}
            viewBox="0 0 1 1"
            preserveAspectRatio="none"
            className="relative aspect-[4/3] w-full touch-none"
            onClick={(e) => {
              if (!subscriptionActive || dragId) return;
              const { x, y } = pointerToNorm(e.clientX, e.clientY);
              if (e.shiftKey) addPoiAt(x, y);
              else addTableAt(x, y);
            }}
          >
            {layout.pois.map((poi) => (
              <g key={poi.id}>
                <circle cx={poi.x} cy={poi.y} r={0.018} fill="#a78bfa" />
                <text x={poi.x + 0.02} y={poi.y} fontSize={0.028} fill="#e9d5ff">
                  {poi.label}
                </text>
              </g>
            ))}
            {layout.tables.map((table) => {
              const active = table.id === selectedTableId;
              return (
                <g
                  key={table.id}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setSelectedTableId(table.id);
                    setDragId(table.id);
                    (e.target as Element).setPointerCapture(e.pointerId);
                  }}
                  onPointerMove={(e) => {
                    if (dragId !== table.id) return;
                    const { x, y } = pointerToNorm(e.clientX, e.clientY);
                    updateTable(table.id, { x, y });
                  }}
                  onPointerUp={(e) => {
                    if (dragId === table.id) {
                      setDragId(null);
                      (e.target as Element).releasePointerCapture(e.pointerId);
                    }
                  }}
                  style={{ cursor: subscriptionActive ? 'grab' : 'default' }}
                >
                  <circle
                    cx={table.x}
                    cy={table.y}
                    r={0.024}
                    fill={active ? '#fbbf24' : '#22c55e'}
                    stroke={active ? '#fff' : '#14532d'}
                    strokeWidth={0.004}
                  />
                  <text
                    x={table.x}
                    y={table.y + 0.045}
                    textAnchor="middle"
                    fontSize={0.03}
                    fill="#fff"
                  >
                    {table.label}
                  </text>
                </g>
              );
            })}
          </svg>
          <p className="border-t border-border px-3 py-2 text-xs text-content-muted">
            Tik = masa ekle · Shift+tik = POI · Surukle = konum
          </p>
        </div>

        <aside className="rounded-xl border border-border bg-surface-card p-4 text-sm">
          <h3 className="font-medium text-content">Secili masa</h3>
          {!selectedTable ? (
            <p className="mt-2 text-content-muted">Duzenlemek icin bir masa secin.</p>
          ) : (
            <div className="mt-3 space-y-3">
              <label className="block text-content-muted">
                Etiket
                <input
                  value={selectedTable.label}
                  onChange={(e) => updateTable(selectedTable.id, { label: e.target.value })}
                  className="mt-1 w-full rounded border border-border bg-surface-input px-2 py-1.5 text-content"
                />
              </label>
              <label className="block text-content-muted">
                Bolge
                <select
                  value={selectedTable.zone}
                  onChange={(e) =>
                    updateTable(selectedTable.id, { zone: e.target.value as FloorPlanTable['zone'] })
                  }
                  className="mt-1 w-full rounded border border-border bg-surface-input px-2 py-1.5 text-content"
                >
                  {ZONE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-content-muted">
                  Min kisi
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={selectedTable.seats_min}
                    onChange={(e) =>
                      updateTable(selectedTable.id, { seats_min: Number(e.target.value) || 1 })
                    }
                    className="mt-1 w-full rounded border border-border bg-surface-input px-2 py-1.5 text-content"
                  />
                </label>
                <label className="block text-content-muted">
                  Max kisi
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={selectedTable.seats_max}
                    onChange={(e) =>
                      updateTable(selectedTable.id, { seats_max: Number(e.target.value) || 1 })
                    }
                    className="mt-1 w-full rounded border border-border bg-surface-input px-2 py-1.5 text-content"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={removeSelected}
                className="text-xs text-rose-300 hover:text-rose-200"
              >
                Masayi sil
              </button>
            </div>
          )}
          <div className="mt-4 border-t border-border pt-3 text-xs text-content-muted">
            POI: {layout.pois.length} · Masa: {layout.tables.length}
          </div>
        </aside>
      </div>

      {message ? <p className="mt-3 text-sm text-success">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
    </section>
  );
}
