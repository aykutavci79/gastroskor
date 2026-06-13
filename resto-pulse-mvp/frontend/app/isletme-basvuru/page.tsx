import Link from 'next/link';

import { BusinessApplicationForm } from '@/components/BusinessApplicationForm';

export const metadata = {
  title: 'İşletme Başvurusu | GastroSkor',
  description: 'Restoran paneli başvuru formu — vergi levhası ve hizmet sözleşmesi',
  alternates: { canonical: '/isletme-basvuru' },
};

export default function BusinessApplicationPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <div>
        <Link href="/" className="text-sm text-accent hover:underline">
          ← Ana sayfa
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-content">İşletme paneli başvurusu</h1>
        <p className="mt-2 text-sm text-content-muted">
          GastroSkor restoran paneline katılmak için formu doldurun. Başvuru sırasında sözleşmeyi kabul edersiniz;
          imzalı nüshayı deneme süresi içinde posta ile iletmeniz gerekir. Sorular için{' '}
          <a href="mailto:destek@gastroskor.com.tr" className="text-accent hover:underline">
            destek@gastroskor.com.tr
          </a>
          .
        </p>
        <p className="mt-2 text-xs text-content-muted">
          Zaten hesabınız varsa{' '}
          <Link href="/panel/claim" className="text-accent hover:underline">
            mekan bağlama (SMS)
          </Link>{' '}
          yolunu da kullanabilirsiniz.
        </p>
      </div>
      <BusinessApplicationForm />
    </div>
  );
}
