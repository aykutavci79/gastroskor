import { Suspense } from 'react';

import { YoreselLezzetlerContent } from '@/app/yoresel-lezzetler/YoreselLezzetlerContent';

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
