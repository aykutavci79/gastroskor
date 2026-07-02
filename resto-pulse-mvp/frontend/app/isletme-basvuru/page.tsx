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
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6">
      <div>
        <Link href="/" className="text-sm font-medium text-orange-600 hover:underline">
          {t('backToHome')}
        </Link>
      </div>

      <section className="rounded-3xl border border-amber-300/80 bg-white/95 p-6 text-center shadow-sm backdrop-blur-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">{t('trialBadge')}</p>
        <h1 className="mt-3 text-3xl font-extrabold leading-tight text-neutral-900 sm:text-4xl">{t('trialHeadline')}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-neutral-700 sm:text-lg">{t('trialLead')}</p>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-neutral-600">{t('trialExit')}</p>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-neutral-600">{t('trialContinue')}</p>
      </section>

      <div className="space-y-2">
        <h2 className="text-xl font-bold text-neutral-900">{t('title')}</h2>
        <p className="text-sm text-neutral-600">
          {t('subtitle')}{' '}
          <a href="mailto:destek@gastroskor.com.tr" className="font-medium text-orange-600 hover:underline">
            destek@gastroskor.com.tr
          </a>
        </p>
      </div>

      <a
        href="/GastroSkor-Restoran-Is-Ortagi-Sunumu.pdf"
        download="GastroSkor-Restoran-Is-Ortagi-Sunumu.pdf"
        className="inline-flex w-full items-center justify-center rounded-xl bg-[#FF6B35] px-5 py-3 text-base font-bold text-[#141414] shadow-sm transition hover:bg-[#e55a25] sm:w-auto">
        {t('downloadPresentation')}
      </a>

      <BusinessApplicationForm />
    </div>
  );
}
