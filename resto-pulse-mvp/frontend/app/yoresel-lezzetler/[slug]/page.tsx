import { Suspense } from 'react';

import { YoreselLezzetDetailContent } from '@/app/yoresel-lezzetler/[slug]/YoreselLezzetDetailContent';

export default function YoreselLezzetDetailPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-5xl px-4 py-10">
          <p className="text-sm text-content-muted">Restoran önerileri yükleniyor…</p>
        </main>
      }>
      <YoreselLezzetDetailContent />
    </Suspense>
  );
}
