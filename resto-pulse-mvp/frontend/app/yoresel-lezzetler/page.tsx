import type { Metadata } from 'next';
import { Suspense } from 'react';

import { YoreselLezzetlerContent } from '@/app/yoresel-lezzetler/YoreselLezzetlerContent';

export const metadata: Metadata = {
  title: 'Bursa Yöresel Lezzetler — Coğrafi İşaretli Ürünler',
  description:
    'Bursa yöresel lezzetleri ve coğrafi işaretli ürünler. İskender, kestane şekeri ve daha fazlası için nerede yenir — GastroSkor rehberi.',
  keywords: ['bursa yöresel', 'bursa lezzetleri', 'coğrafi işaret', 'iskender', 'gastroskor'],
  alternates: { canonical: '/yoresel-lezzetler' },
};

export default function YoreselLezzetlerPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-5xl px-4 py-10">
          <p className="text-sm text-content-muted">Yöresel lezzetler yükleniyor…</p>
        </main>
      }>
      <YoreselLezzetlerContent />
    </Suspense>
  );
}
