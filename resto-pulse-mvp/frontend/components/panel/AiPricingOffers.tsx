'use client';

import { useState } from 'react';

import { purchasePanelAiAddon } from '@/lib/api';
import type { AiAnalysisQuota, AiPricingCatalog } from '@/lib/types';

type Props = {
  userEmail: string;
  quota: AiAnalysisQuota;
  pricing: AiPricingCatalog;
  onUpdated: (quota: AiAnalysisQuota) => void;
};

export function AiPricingOffers({ userEmail, quota, pricing, onUpdated }: Props) {
  const [busySku, setBusySku] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onPurchase(sku: string) {
    setBusySku(sku);
    setError(null);
    setMessage(null);
    try {
      const res = await purchasePanelAiAddon(userEmail, sku);
      onUpdated(res.ai_quota);
      setMessage(res.purchase.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Satin alma basarisiz');
    } finally {
      setBusySku(null);
    }
  }

  const { base_panel, offers, payments_mock_enabled } = pricing;

  return (
    <div className="mt-4 rounded-xl border border-violet-500/25 bg-violet-500/5 p-4">
      <h3 className="text-sm font-semibold text-violet-100">AI paketleri</h3>
      <p className="mt-1 text-xs text-content-muted">
        Panel: ilk ay {base_panel.intro_month_tl} TL, sonra {base_panel.monthly_tl} TL/ay · Standart{' '}
        {base_panel.standard_ai_interval_days} gunde 1 AI
      </p>
      <ul className="mt-3 space-y-2">
        {offers.map((offer) => (
          <li
            key={offer.sku}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface/70 px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-content">{offer.title}</p>
              <p className="text-xs text-content-muted">{offer.description}</p>
              <p className="mt-1 text-xs text-brand-gold">
                {offer.price_tl} TL
                {offer.billing === 'monthly_addon' ? ' / ay (panele ek)' : ' · tek sefer'}
              </p>
            </div>
            <button
              type="button"
              disabled={busySku !== null}
              onClick={() => void onPurchase(offer.sku)}
              className="shrink-0 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-content hover:bg-violet-500 disabled:opacity-50">
              {busySku === offer.sku ? '...' : payments_mock_enabled ? 'Dene (test)' : 'Yakinda'}
            </button>
          </li>
        ))}
      </ul>
      {payments_mock_enabled ? (
        <p className="mt-2 text-xs text-content-muted">
          Test modu: odeme simule edilir, hak aninda acilir. Canlida iyzico baglanacak.
        </p>
      ) : null}
      {message ? <p className="mt-2 text-xs text-success">{message}</p> : null}
      {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}
    </div>
  );
}
