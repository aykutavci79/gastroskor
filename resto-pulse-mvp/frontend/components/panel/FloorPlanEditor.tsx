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
  { value: 'entrance', label: 'Giris / kapi' },
  { value: 'exit', label: 'Cikis' },
  { value: 'live_music', label: 'Canli muzik' },
  { value: 'bar', label: 'Bar' },
  { value: 'other', label: 'Diger' },
] as const;

type PlaceMode = 'table' | 'poi';
type ZoneValue = FloorPlanTable['zone'];
type PoiKind = FloorPlanPoi['kind'];

function newTableId() {
  return `t-${Date.now().toString(36)}`;
}

function newPoiId() {
  return `p-${Date.now().toString(36)}`;
}

function emptyLayout(): FloorPlanLayout {
  return { version: 1, tables: [], pois: [] };
}

const SEATS_MIN = 1;
const SEATS_MAX = 200;

function clampTableSeats(
  seatsMin: number,
  seatsMax: number,
): { seats_min: number; seats_max: number } {
  let seats_min = Math.round(Number(seatsMin));
  let seats_max = Math.round(Number(seatsMax));
  if (!Number.isFinite(seats_min)) seats_min = SEATS_MIN;
  if (!Number.isFinite(seats_max)) seats_max = seats_min;
  seats_min = Math.min(SEATS_MAX, Math.max(SEATS_MIN, seats_min));
  seats_max = Math.min(SEATS_MAX, Math.max(SEATS_MIN, seats_max));
  if (seats_max < seats_min) {
    seats_max = seats_min;
  }
  return { seats_min, seats_max };
}

function poiZone(poi: FloorPlanPoi): ZoneValue {
  return poi.zone ?? 'salon';
}

function normalizeLayout(raw: FloorPlanLayout | null | undefined): FloorPlanLayout {
  if (!raw || typeof raw !== 'object') return emptyLayout();
  return {
    version: 1,
    tables: Array.isArray(raw.tables)
      ? raw.tables.map((table) => {
          const seats = clampTableSeats(table.seats_min, table.seats_max);
          return { ...table, ...seats };
        })
      : [],
    pois: Array.isArray(raw.pois)
      ? raw.pois.map((poi) => ({
          ...poi,
          zone: poiZone(poi),
        }))
      : [],
  };
}

export function FloorPlanEditor({ userEmail, subscriptionActive }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [plan, setPlan] = useState<FloorPlanRead | null>(null);
  const [layout, setLayout] = useState<FloorPlanLayout>(emptyLayout());
  const [backgroundUrl, setBackgroundUrl] = useState('');
  const [activeZone, setActiveZone] = useState<ZoneValue>('salon');
  const [placeMode, setPlaceMode] = useState<PlaceMode>('table');
  const [newPoiKind, setNewPoiKind] = useState<PoiKind>('entrance');
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragKind, setDragKind] = useState<'table' | 'poi' | null>(null);
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
  const selectedPoi = layout.pois.find((p) => p.id === selectedPoiId) ?? null;
  const zoneTables = layout.tables.filter((table) => table.zone === activeZone);
  const zonePois = layout.pois.filter((poi) => poiZone(poi) === activeZone);
  const activeZoneLabel = ZONE_OPTIONS.find((opt) => opt.value === activeZone)?.label ?? activeZone;

  function switchZone(zone: ZoneValue) {
    setActiveZone(zone);
    setSelectedTableId(null);
    setSelectedPoiId(null);
    setDragId(null);
    setDragKind(null);
  }

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
      tables: prev.tables.map((row) => {
        if (row.id !== id) return row;
        const next = { ...row, ...patch };
        const seats = clampTableSeats(next.seats_min, next.seats_max);
        return { ...next, ...seats };
      }),
    }));
  }

  function addTableAt(x: number, y: number) {
    const id = newTableId();
    const zoneCount = layout.tables.filter((row) => row.zone === activeZone).length;
    const next: FloorPlanTable = {
      id,
      zone: activeZone,
      label: `M${zoneCount + 1}`,
      seats_min: 2,
      seats_max: 4,
      x,
      y,
    };
    setLayout((prev) => ({ ...prev, tables: [...prev.tables, next] }));
    setSelectedTableId(id);
    setSelectedPoiId(null);
  }

  function updatePoi(id: string, patch: Partial<FloorPlanPoi>) {
    setLayout((prev) => ({
      ...prev,
      pois: prev.pois.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    }));
  }

  function addPoiAt(x: number, y: number) {
    const id = newPoiId();
    const label = POI_OPTIONS.find((opt) => opt.value === newPoiKind)?.label ?? 'Isaret';
    const next: FloorPlanPoi = {
      id,
      kind: newPoiKind,
      label,
      zone: activeZone,
      x,
      y,
    };
    setLayout((prev) => ({ ...prev, pois: [...prev.pois, next] }));
    setSelectedPoiId(id);
    setSelectedTableId(null);
  }

  function removeTable(id: string) {
    setLayout((prev) => ({
      ...prev,
      tables: prev.tables.filter((t) => t.id !== id),
    }));
    setSelectedTableId((current) => (current === id ? null : current));
  }

  function removePoi(id: string) {
    setLayout((prev) => ({
      ...prev,
      pois: prev.pois.filter((p) => p.id !== id),
    }));
    setSelectedPoiId((current) => (current === id ? null : current));
  }

  function clearZoneTables() {
    if (!zoneTables.length) return;
    if (
      !window.confirm(
        `${activeZoneLabel} bolgesindeki ${zoneTables.length} masayi silmek istediginize emin misiniz?`,
      )
    ) {
      return;
    }
    setLayout((prev) => ({
      ...prev,
      tables: prev.tables.filter((table) => table.zone !== activeZone),
    }));
    setSelectedTableId(null);
  }

  function removeSelected() {
    if (selectedTableId) removeTable(selectedTableId);
    else if (selectedPoiId) removePoi(selectedPoiId);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Delete' && event.key !== 'Backspace') return;
      const tag = (event.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (selectedTableId) {
        event.preventDefault();
        removeTable(selectedTableId);
      } else if (selectedPoiId) {
        event.preventDefault();
        removePoi(selectedPoiId);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedPoiId, selectedTableId]);

  async function onSaveDraft() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const saved = await savePanelFloorPlan(userEmail, {
        layout: normalizeLayout(layout),
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
            Once bolge secin (Salon / Bahce / Teras), sonra krokiye masa veya giris isareti ekleyin.
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
        <div className="overflow-hidden rounded-xl border border-border bg-surface-card">
          <div className="space-y-3 border-b border-border bg-surface-input/60 p-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Bolge</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {ZONE_OPTIONS.map((opt) => {
                  const tableCount = layout.tables.filter((table) => table.zone === opt.value).length;
                  const poiCount = layout.pois.filter((poi) => poiZone(poi) === opt.value).length;
                  const active = activeZone === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => switchZone(opt.value)}
                      className={`rounded-lg border px-2 py-2.5 text-sm transition ${
                        active
                          ? 'border-brand-gold bg-brand-gold/20 font-semibold text-brand-gold'
                          : 'border-border bg-surface-card text-content hover:border-brand-gold/40'
                      }`}
                    >
                      {opt.label}
                      <span className="mt-0.5 block text-[11px] font-normal opacity-80">
                        {tableCount} masa · {poiCount} isaret
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">
                Krokiye ne ekleyeceksin?
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPlaceMode('table')}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    placeMode === 'table'
                      ? 'border-emerald-500/60 bg-emerald-500/15 font-medium text-emerald-200'
                      : 'border-border bg-surface-card text-content-muted hover:text-content'
                  }`}
                >
                  Masa ekle
                </button>
                <button
                  type="button"
                  onClick={() => setPlaceMode('poi')}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    placeMode === 'poi'
                      ? 'border-violet-500/60 bg-violet-500/15 font-medium text-violet-200'
                      : 'border-border bg-surface-card text-content-muted hover:text-content'
                  }`}
                >
                  Giris / isaret
                </button>
              </div>
              {placeMode === 'poi' ? (
                <label className="mt-2 block text-xs text-content-muted">
                  Isaret turu
                  <select
                    value={newPoiKind}
                    onChange={(e) => setNewPoiKind(e.target.value as PoiKind)}
                    className="mt-1 w-full rounded-lg border border-border bg-surface-card px-2 py-1.5 text-sm text-content"
                  >
                    {POI_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
          </div>

          <div className="relative">
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
              if (e.target !== e.currentTarget) return;
              setSelectedTableId(null);
              setSelectedPoiId(null);
              const { x, y } = pointerToNorm(e.clientX, e.clientY);
              if (placeMode === 'poi') addPoiAt(x, y);
              else addTableAt(x, y);
            }}
          >
            {zonePois.map((poi) => {
              const active = poi.id === selectedPoiId;
              return (
                <g
                  key={poi.id}
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setSelectedPoiId(poi.id);
                    setSelectedTableId(null);
                    setDragId(poi.id);
                    setDragKind('poi');
                    (e.target as Element).setPointerCapture(e.pointerId);
                  }}
                  onPointerMove={(e) => {
                    if (dragId !== poi.id || dragKind !== 'poi') return;
                    const { x, y } = pointerToNorm(e.clientX, e.clientY);
                    updatePoi(poi.id, { x, y });
                  }}
                  onPointerUp={(e) => {
                    if (dragId === poi.id && dragKind === 'poi') {
                      setDragId(null);
                      setDragKind(null);
                      (e.target as Element).releasePointerCapture(e.pointerId);
                    }
                  }}
                  style={{ cursor: subscriptionActive ? 'grab' : 'default' }}
                >
                  <circle cx={poi.x} cy={poi.y} r={0.022} fill={active ? '#c4b5fd' : '#a78bfa'} />
                  <text x={poi.x + 0.02} y={poi.y} fontSize={0.028} fill="#e9d5ff">
                    {poi.label}
                  </text>
                </g>
              );
            })}
            {zoneTables.map((table) => {
              const active = table.id === selectedTableId;
              return (
                <g
                  key={table.id}
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setSelectedTableId(table.id);
                    setSelectedPoiId(null);
                    setDragId(table.id);
                    setDragKind('table');
                    (e.target as Element).setPointerCapture(e.pointerId);
                  }}
                  onPointerMove={(e) => {
                    if (dragId !== table.id || dragKind !== 'table') return;
                    const { x, y } = pointerToNorm(e.clientX, e.clientY);
                    updateTable(table.id, { x, y });
                  }}
                  onPointerUp={(e) => {
                    if (dragId === table.id && dragKind === 'table') {
                      setDragId(null);
                      setDragKind(null);
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
          </div>
          <p className="border-t border-border px-3 py-2 text-xs text-content-muted">
            {activeZoneLabel} ·{' '}
            {placeMode === 'table'
              ? 'bos alana tik = masa · surukle = konum'
              : 'bos alana tik = isaret (giris/cikis) · mor nokta · surukle = konum'}
          </p>
        </div>

        <aside className="rounded-xl border border-border bg-surface-card p-4 text-sm">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-medium text-content">Secim</h3>
            {zoneTables.length > 0 ? (
              <button
                type="button"
                onClick={clearZoneTables}
                className="text-xs text-rose-300 hover:text-rose-100"
              >
                {activeZoneLabel} masalarini sil
              </button>
            ) : null}
          </div>
          {!selectedTable && !selectedPoi ? (
            <div className="mt-2 space-y-2 text-content-muted">
              <p>
                <strong className="text-content">{activeZoneLabel}</strong> krokisi duzenleniyor.
              </p>
              <p>
                {placeMode === 'table'
                  ? 'Yesil alana tiklayarak masa ekleyin. Masaya tiklayinca sagda duzenlersiniz.'
                  : 'Mor isaret modu acik — kapi/giris yerine tiklayin. Mor noktayi surukleyerek tasiyin.'}
              </p>
            </div>
          ) : selectedPoi ? (
            <div className="mt-3 space-y-3">
              <p className="text-content">
                Isaret: <strong>{selectedPoi.label}</strong>
              </p>
              <label className="block text-content-muted">
                Etiket
                <input
                  value={selectedPoi.label}
                  onChange={(e) => updatePoi(selectedPoi.id, { label: e.target.value })}
                  className="mt-1 w-full rounded border border-border bg-surface-input px-2 py-1.5 text-content"
                />
              </label>
              <label className="block text-content-muted">
                Tur
                <select
                  value={selectedPoi.kind}
                  onChange={(e) => {
                    const kind = e.target.value as PoiKind;
                    updatePoi(selectedPoi.id, { kind });
                  }}
                  className="mt-1 w-full rounded border border-border bg-surface-input px-2 py-1.5 text-content"
                >
                  {POI_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-xs text-content-muted">Bolge: {activeZoneLabel}</p>
              <button
                type="button"
                onClick={removeSelected}
                className="w-full rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-200 hover:bg-rose-500/20"
              >
                Isareti sil
              </button>
            </div>
          ) : selectedTable ? (
            <div className="mt-3 space-y-3">
              <label className="block text-content-muted">
                Etiket
                <input
                  value={selectedTable.label}
                  onChange={(e) => updateTable(selectedTable.id, { label: e.target.value })}
                  className="mt-1 w-full rounded border border-border bg-surface-input px-2 py-1.5 text-content"
                />
              </label>
              <p className="text-xs text-content-muted">
                Bolge: <strong className="text-content">{activeZoneLabel}</strong> (ustteki sekmelerden
                degistirin)
              </p>
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-content-muted">
                  Min kisi
                  <input
                    type="number"
                    min={SEATS_MIN}
                    max={SEATS_MAX}
                    value={selectedTable.seats_min}
                    onChange={(e) =>
                      updateTable(selectedTable.id, { seats_min: Number(e.target.value) })
                    }
                    className="mt-1 w-full rounded border border-border bg-surface-input px-2 py-1.5 text-content"
                  />
                </label>
                <label className="block text-content-muted">
                  Max kisi
                  <input
                    type="number"
                    min={SEATS_MIN}
                    max={SEATS_MAX}
                    value={selectedTable.seats_max}
                    onChange={(e) =>
                      updateTable(selectedTable.id, { seats_max: Number(e.target.value) })
                    }
                    className="mt-1 w-full rounded border border-border bg-surface-input px-2 py-1.5 text-content"
                  />
                </label>
              </div>
              <p className="text-xs text-content-muted">
                Min ≤ max. Masa fiziksel kapasitesi; uygulama rezervasyon limiti ayri ayarlanir.
              </p>
              <button
                type="button"
                onClick={removeSelected}
                className="w-full rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-200 hover:bg-rose-500/20"
              >
                Masayi sil
              </button>
            </div>
          ) : null}
          <div className="mt-4 border-t border-border pt-3 text-xs text-content-muted">
            {activeZoneLabel}: {zoneTables.length} masa · {zonePois.length} isaret · Toplam:{' '}
            {layout.tables.length} masa
          </div>
        </aside>
      </div>

      {message ? <p className="mt-3 text-sm text-success">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
    </section>
  );
}
