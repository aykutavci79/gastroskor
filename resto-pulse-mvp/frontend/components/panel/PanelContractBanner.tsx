'use client';

import { usePanel } from '@/components/panel/PanelContext';

export function PanelContractBanner() {
  const { access } = usePanel();

  if (!access?.can_access_panel) return null;
  if (!access.contract_required || access.contract_signed_received) return null;

  const days = access.trial_days_left;
  const urgency =
    days != null && days <= 7
      ? 'Deneme süreniz bitmek üzere.'
      : 'Deneme süresi boyunca paneli kullanabilirsiniz.';

  return (
    <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-50">
      <p className="font-semibold text-brand-gold">İmzalı sözleşme bekleniyor</p>
      <p className="mt-1">
        {urgency} Başvuru sırasında kabul ettiğiniz sözleşmenin imzalı nüshasını posta ile gönderin; aksi halde
        deneme bitiminde panel kapatılır.
        {days != null ? ` Kalan deneme: ${days} gün.` : ''}
      </p>
      <p className="mt-2 text-xs text-amber-100/90">
        Gönderim adresi onay e-postanızda yer alır. Sorular:{' '}
        <a href="mailto:destek@gastroskor.com.tr" className="underline">
          destek@gastroskor.com.tr
        </a>
      </p>
    </div>
  );
}
