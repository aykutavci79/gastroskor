'use client';

import { FormEvent, useEffect, useState } from 'react';

import {
  addPanelMenuItem,
  deletePanelMenuItem,
  getPanelMenu,
  updatePanelMenuItem,
} from '@/lib/api';
import type { RestaurantMenuItem } from '@/lib/types';

type Props = {
  userEmail: string;
  subscriptionActive: boolean;
};

export function RestaurantMenuEditor({ userEmail, subscriptionActive }: Props) {
  const [items, setItems] = useState<RestaurantMenuItem[]>([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    const data = await getPanelMenu(userEmail);
    setItems(data.items);
  }

  useEffect(() => {
    setLoading(true);
    getPanelMenu(userEmail)
      .then((data) => setItems(data.items))
      .catch((err) => setError(err instanceof Error ? err.message : 'Menu yuklenemedi'))
      .finally(() => setLoading(false));
  }, [userEmail]);

  async function onAdd(event: FormEvent) {
    event.preventDefault();
    const priceNum = Number(price.replace(',', '.'));
    if (!name.trim() || Number.isNaN(priceNum)) return;
    setSaving(true);
    setError(null);
    try {
      await addPanelMenuItem({
        user_email: userEmail,
        name: name.trim(),
        price_tl: priceNum,
        category: category.trim() || null,
        description: description.trim() || null,
      });
      setName('');
      setPrice('');
      setCategory('');
      setDescription('');
      await reload();
      setMessage('Urun eklendi.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eklenemedi');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(itemId: string) {
    setSaving(true);
    setError(null);
    try {
      await deletePanelMenuItem(userEmail, itemId);
      await reload();
      setMessage('Urun silindi.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Silinemedi');
    } finally {
      setSaving(false);
    }
  }

  async function onToggleActive(item: RestaurantMenuItem) {
    setSaving(true);
    try {
      await updatePanelMenuItem(item.id, {
        user_email: userEmail,
        is_active: !item.is_active,
      });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Guncellenemedi');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-400">Menu yukleniyor...</p>;
  }

  return (
    <section className="rounded-2xl border border-amber-500/25 bg-slate-900/70 p-5">
      <h2 className="text-lg font-semibold text-white">Menu ve fiyatlar</h2>
      <p className="mt-1 text-sm text-slate-400">
        Musteri arama kartinda ilk urunler, detay sayfasinda tam menu gorunur. Abonelik bitince menu
        gizlenir.
      </p>
      {!subscriptionActive ? (
        <p className="mt-2 text-xs text-amber-200">Aktif abonelik gerekir.</p>
      ) : null}

      <form onSubmit={onAdd} className="mt-4 grid gap-2 sm:grid-cols-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Urun adi (Ornek: Adana durum)"
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white sm:col-span-2"
        />
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Fiyat TL (120)"
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        />
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Kategori (Ana yemek)"
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Aciklama (opsiyonel)"
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white sm:col-span-2"
        />
        <button
          type="submit"
          disabled={saving || !subscriptionActive}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-amber-950 disabled:opacity-50 sm:col-span-2">
          Urun ekle
        </button>
      </form>

      <ul className="mt-4 space-y-2">
        {items.length === 0 ? (
          <li className="text-sm text-slate-500">Henuz menu urunu yok.</li>
        ) : (
          items.map((item) => (
            <li
              key={item.id}
              className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${
                item.is_active ? 'border-slate-700 bg-slate-950/60' : 'border-slate-800 opacity-50'
              }`}>
              <div>
                <p className="font-medium text-white">
                  {item.name}{' '}
                  <span className="text-amber-200">{item.price_tl.toFixed(2)} TL</span>
                </p>
                {item.category ? <p className="text-xs text-slate-500">{item.category}</p> : null}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void onToggleActive(item)}
                  className="text-xs text-slate-400 hover:text-white">
                  {item.is_active ? 'Gizle' : 'Goster'}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void onDelete(item.id)}
                  className="text-xs text-rose-300 hover:text-rose-100">
                  Sil
                </button>
              </div>
            </li>
          ))
        )}
      </ul>

      {message ? <p className="mt-3 text-sm text-emerald-300">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
    </section>
  );
}
