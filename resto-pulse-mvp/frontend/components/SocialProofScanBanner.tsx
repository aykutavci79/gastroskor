'use client';

import { useTranslations } from 'next-intl';

import type { SocialProofStatus } from '@/lib/types';

type Props = {
  social: SocialProofStatus | null;
  onRequestScan?: () => void;
  scanLoading?: boolean;
  loggedIn?: boolean;
  socialSortActive?: boolean;
  /** Sosyal modda otomatik tarama bekleniyor */
  autoScan?: boolean;
};

export function SocialProofScanBanner({
  social,
  onRequestScan,
  scanLoading,
  loggedIn,
  socialSortActive,
  autoScan,
}: Props) {
  const t = useTranslations('socialProof');

  if (!social) return null;

  if (social.status === 'scanning' || social.status === 'pending') {
    const pct = social.progress_pct ?? 10;
    return (
      <div className="rounded-xl border border-border bg-surface-muted/60 p-3 text-sm">
        <p className="font-medium text-content">{t('scanning')}</p>
        <p className="mt-1 text-xs text-content-muted">
          {social.scan_label ? `${social.scan_label} · ` : ''}
          {t('scanningNote', { pct })}
        </p>
      </div>
    );
  }

  if (social.status === 'ready' && social.results?.length && socialSortActive) {
    return (
      <div className="rounded-xl border border-accent/30 bg-accent/5 p-3 text-sm">
        <p className="font-medium text-content">{t('sortReady')}</p>
        <p className="mt-1 text-xs text-content-muted">
          {t('sortReadyNote')}
        </p>
      </div>
    );
  }

  if (social.status === 'insufficient_data' && !social.can_scan) {
    return (
      <div className="rounded-xl border border-border bg-surface-muted/40 p-3 text-sm text-content-muted">
        {t('noData')}
      </div>
    );
  }

  if (social.status === 'uncached' || (social.status === 'insufficient_data' && social.can_scan)) {
    const label = social.scan_label ?? 'bu ürün';
    if (!loggedIn) {
      return (
        <div className="rounded-xl border border-border bg-surface-muted/40 p-3 text-sm text-content-muted">
          {t('noSignalLogin', { label })}
        </div>
      );
    }
    if (autoScan) {
      return (
        <div className="rounded-xl border border-border bg-surface-muted/60 p-3 text-sm">
          <p className="font-medium text-content">{t('scanStarting', { label })}</p>
          <p className="mt-1 text-xs text-content-muted">{t('scanStartingNote')}</p>
        </div>
      );
    }
    return (
      <div className="rounded-xl border border-border bg-surface-muted/60 p-3 text-sm">
        <p className="font-medium text-content">{t('noSignal', { label })}</p>
        <p className="mt-1 text-xs text-content-muted">
          {t('scanDescription')}
        </p>
        <button
          type="button"
          onClick={onRequestScan}
          disabled={scanLoading || !onRequestScan}
          className="btn-primary mt-3 text-sm disabled:opacity-60">
          {scanLoading ? t('starting') : t('scanButton')}
        </button>
      </div>
    );
  }

  if (social.status === 'failed') {
    return (
      <div className="rounded-xl border border-bad/40 bg-bad/10 p-3 text-sm text-red-200">
        {t('failed')}
        {onRequestScan ? (
          <button
            type="button"
            onClick={onRequestScan}
            disabled={scanLoading}
            className="btn-primary mt-2 text-sm disabled:opacity-60">
            {scanLoading ? t('starting') : t('retry')}
          </button>
        ) : null}
      </div>
    );
  }

  return null;
}
