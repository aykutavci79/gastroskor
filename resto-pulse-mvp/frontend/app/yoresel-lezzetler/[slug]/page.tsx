import type { Metadata } from 'next';
import { Suspense } from 'react';

import { YoreselLezzetDetailContent } from '@/app/yoresel-lezzetler/[slug]/YoreselLezzetDetailContent';
import { getApiV1Base } from '@/lib/api-base';
import type { RegionalProductDetailResponse } from '@/lib/types';

type Props = {
  params: Promise<{ slug: string }>;
};

async function fetchProduct(slug: string): Promise<RegionalProductDetailResponse | null> {
  try {
    const response = await fetch(
      `${getApiV1Base()}/regional-flavors/products/${encodeURIComponent(slug)}?city=Bursa`,
      { next: { revalidate: 86400 } },
    );
    if (!response.ok) return null;
    return (await response.json()) as RegionalProductDetailResponse;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchProduct(slug);
  if (!data?.product) {
    return { title: 'Yöresel lezzet' };
  }
  const { product } = data;
  const title = `${product.name} — Bursa'da nerede yenir?`;
  const description = `${product.name} (${product.city}): ${product.summary} GastroSkor ile mekan önerileri.`;
  return {
    title,
    description,
    alternates: { canonical: `/yoresel-lezzetler/${slug}` },
    openGraph: { title, description },
  };
}

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
