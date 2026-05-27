'use client';

import { FormEvent, useState } from 'react';

type DiscountOption = 10 | 25 | 50;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: { discountPercent: DiscountOption; expiresAt: string }) => Promise<void> | void;
  isSubmitting?: boolean;
};

const OPTIONS: DiscountOption[] = [10, 25, 50];

function createDefaultExpiry() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

export function CompensationCouponModal({ isOpen, onClose, onSubmit, isSubmitting = false }: Props) {
  const [discountPercent, setDiscountPercent] = useState<DiscountOption>(25);
  const [expiresAt, setExpiresAt] = useState(createDefaultExpiry);

  if (!isOpen) return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await onSubmit({ discountPercent, expiresAt });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-slate-700/80 bg-slate-900 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Telafi Kuponu Oluştur</h3>
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:bg-slate-800">
            Kapat
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">İndirim oranı</p>
            <div className="inline-flex rounded-xl border border-slate-700 bg-slate-950/80 p-1">
              {OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setDiscountPercent(option)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    discountPercent === option
                      ? 'bg-emerald-500 text-emerald-950'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}>
                  %{option}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Geçerlilik tarihi
            </span>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/40"
              required
            />
          </label>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800">
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60">
              {isSubmitting ? 'Oluşturuluyor...' : 'Kuponu Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

