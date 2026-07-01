'use client';

import { useTranslations } from 'next-intl';

export function SloganBanner() {
  const t = useTranslations('sloganBanner');
  return (
    <section
      className="rounded-2xl border-2 border-accent bg-surface-card px-5 py-5 text-center shadow-[0_0_24px_rgba(255,107,53,0.12)]"
      style={{ backgroundColor: '#1E1E1E' }}>
      <h1 className="text-xl font-extrabold text-content sm:text-2xl">{t('title')}</h1>
      <p className="mt-1 text-base font-semibold text-content-muted">
        {t('subtitlePre')} <span className="text-accent">{t('subtitleAccent')}</span> {t('subtitlePost')}
      </p>
    </section>
  );
}
