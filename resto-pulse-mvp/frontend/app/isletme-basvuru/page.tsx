import { useTranslations } from 'next-intl';
import Link from 'next/link';

import { BusinessApplicationForm } from '@/components/BusinessApplicationForm';

export const metadata = {
  title: 'İşletme Başvurusu | GastroSkor',
  description: 'Restoran paneli başvuru formu — vergi levhası ve hizmet sözleşmesi',
  alternates: { canonical: '/isletme-basvuru' },
};

export default function BusinessApplicationPage() {
  const t = useTranslations('businessApply');

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <div>
        <Link href="/" className="text-sm text-accent hover:underline">
          {t('backToHome')}
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-content">{t('title')}</h1>
        <p className="mt-2 text-sm text-content-muted">
          {t('subtitle')}{' '}
          <a href="mailto:destek@gastroskor.com.tr" className="text-accent hover:underline">
            destek@gastroskor.com.tr
          </a>
          {t('subtitleContact')}
        </p>
        <p className="mt-2 text-xs text-content-muted">
          {t('alreadyHaveAccount')}{' '}
          <Link href="/panel/claim" className="text-accent hover:underline">
            {t('claimViaPhone')}
          </Link>{' '}
          {t('alreadyHaveAccountSuffix')}
        </p>
      </div>
      <BusinessApplicationForm />
    </div>
  );
}
