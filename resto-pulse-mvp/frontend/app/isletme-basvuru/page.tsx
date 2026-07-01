import { useTranslations } from 'next-intl';
import Link from 'next/link';

import { BusinessApplicationForm } from '@/components/BusinessApplicationForm';

export const metadata = {
  title: 'İşletme Başvurusu | GastroSkor',
  description: '3 ay ücretsiz deneme — restoran paneli başvurusu',
  alternates: { canonical: '/isletme-basvuru' },
};

export default function BusinessApplicationPage() {
  const t = useTranslations('businessApply');

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <div>
        <Link href="/" className="text-sm text-accent hover:underline">
          {t('backToHome')}
        </Link>
      </div>

      <section className="rounded-3xl border border-amber-400/40 bg-gradient-to-br from-amber-500/20 via-amber-600/10 to-transparent p-6 sm:p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-gold">{t('trialBadge')}</p>
        <h1 className="mt-3 text-3xl font-extrabold leading-tight text-content sm:text-4xl">{t('trialHeadline')}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-content sm:text-lg">{t('trialLead')}</p>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-content-muted">{t('trialExit')}</p>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-content-muted">{t('trialContinue')}</p>
      </section>

      <div className="space-y-2">
        <h2 className="text-xl font-bold text-content">{t('title')}</h2>
        <p className="text-sm text-content-muted">
          {t('subtitle')}{' '}
          <a href="mailto:destek@gastroskor.com.tr" className="text-accent hover:underline">
            destek@gastroskor.com.tr
          </a>
        </p>
      </div>

      <BusinessApplicationForm />
    </div>
  );
}
