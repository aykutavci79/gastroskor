import type { Metadata } from 'next';
import Link from 'next/link';

import { JsonLd } from '@/components/JsonLd';
import { RegionalFlavorFaq } from '@/components/RegionalFlavorFaq';
import { GASTRO_FAQ_ITEMS } from '@/lib/faq-content';
import { getSiteHomeUrl } from '@/lib/site-url';
import { buildFaqJsonLd } from '@/lib/structured-data';

const homeUrl = getSiteHomeUrl();

export const metadata: Metadata = {
  title: 'Sık Sorulan Sorular (SSS)',
  description:
    'GastroSkor nedir, GS puanı nasıl çalışır, yorum nasıl yazılır, işletme paneli, hesap silme ve destek — sık sorulan sorular.',
  alternates: { canonical: '/sss' },
  openGraph: {
    title: 'GastroSkor — Sık Sorulan Sorular',
    description:
      'GastroSkor uygulaması, GS puanı, işletme paneli, online sipariş ve hesap yönetimi hakkında sık sorulan sorular.',
    url: `${homeUrl}/sss`,
  },
};

export default function SssPage() {
  const faqJsonLd = buildFaqJsonLd(GASTRO_FAQ_ITEMS);

  return (
    <>
      {faqJsonLd ? <JsonLd data={faqJsonLd} /> : null}
      <article className="mx-auto max-w-3xl space-y-8">
        <div>
          <Link href="/" className="text-sm text-accent hover:underline">
            ← Ana sayfa
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-content">Sık Sorulan Sorular</h1>
          <p className="mt-3 text-sm leading-relaxed text-content-muted">
            GastroSkor uygulaması, GS puanı, yorumlar, işletme paneli ve hesap yönetimi hakkında en çok
            sorulan konular. Aradığınız cevabı bulamazsanız{' '}
            <a href="mailto:destek@gastroskor.com.tr" className="text-accent hover:underline">
              destek@gastroskor.com.tr
            </a>{' '}
            adresine yazın.
          </p>
        </div>

        <RegionalFlavorFaq items={GASTRO_FAQ_ITEMS} heading="Genel" />

        <section className="rounded-2xl border border-border/70 bg-surface-card px-4 py-5 text-sm text-content-muted">
          <h2 className="text-base font-semibold text-content">İlgili sayfalar</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>
              <Link href="/isletme-basvuru" className="text-accent hover:underline">
                İşletme başvurusu
              </Link>
            </li>
            <li>
              <Link href="/hesap-sil" className="text-accent hover:underline">
                Hesap ve veri silme
              </Link>
            </li>
            <li>
              <Link href="/gizlilik" className="text-accent hover:underline">
                Gizlilik politikası
              </Link>
            </li>
            <li>
              <Link href="/kvkk" className="text-accent hover:underline">
                KVKK
              </Link>
            </li>
            <li>
              <Link href="/kullanim-kosullari" className="text-accent hover:underline">
                Kullanım koşulları
              </Link>
            </li>
            <li>
              <Link href="/bursa" className="text-accent hover:underline">
                Bursa restoranları
              </Link>
            </li>
          </ul>
        </section>
      </article>
    </>
  );
}
