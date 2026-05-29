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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface/90 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border/80 bg-surface-input p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-content">Telafi Kuponu Oluştur</h3>
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-3 py-1 text-xs text-content-muted transition hover:bg-surface-input">
            Kapat
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-content-muted">İndirim oranı</p>
            <div className="inline-flex rounded-xl border border-border bg-surface/90 p-1">
              {OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setDiscountPercent(option)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    discountPercent === option
                      ? 'bg-emerald-500 text-content'
                      : 'text-content-muted hover:bg-surface-input'
                  }`}>
                  %{option}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-content-muted">
              Geçerlilik tarihi
            </span>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface/90 px-3 py-2 text-sm text-content outline-none focus:ring-2 focus:ring-brand/40"
              required
            />
          </label>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2 text-sm text-content-muted transition hover:bg-surface-input">
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary btn-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60">
              {isSubmitting ? 'Oluşturuluyor...' : 'Kuponu Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

