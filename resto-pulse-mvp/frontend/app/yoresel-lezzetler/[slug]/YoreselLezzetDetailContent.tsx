'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { RegionalFlavorFaq } from '@/components/RegionalFlavorFaq';
import { RegionalFlavorRestaurantSection } from '@/components/RegionalFlavorRestaurantSection';
import { RegionalProductImage } from '@/components/RegionalProductImage';
import { getRegionalProduct } from '@/lib/api';
import type { RegionalFlavorPageContent } from '@/lib/regional-flavor-page-content';
import { resolveRegionalFlavorH1 } from '@/lib/regional-flavor-page-content';
import { trimImageAlt } from '@/lib/seo-title';
import type { RegionalProductItem } from '@/lib/types';

type Props = {
  pageContent?: RegionalFlavorPageContent | null;
  initialProduct?: RegionalProductItem | null;
};

export function YoreselLezzetDetailContent({
  pageContent = null,
  initialProduct = null,
}: Props) {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const slug = params.slug;
  const city = useMemo(
    () => searchParams.get('city')?.trim() || pageContent?.city || 'Bursa',
    [searchParams, pageContent?.city],
  );
  const [product, setProduct] = useState<RegionalProductItem | null>(initialProduct);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!initialProduct);

  const useTemplate = Boolean(pageContent);

  useEffect(() => {
    if (initialProduct && initialProduct.slug === slug) {
      setProduct(initialProduct);
      setLoading(false);
      return;
    }

    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    getRegionalProduct(slug, { city })
      .then((detail) => {
        if (cancelled) return;
        setProduct(detail.product);
      })
      .catch((err) => {
        if (!cancelled) {
          setProduct(null);
          setError(err instanceof Error ? err.message : 'Ürün bilgisi alınamadı.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, city, initialProduct]);

  if (useTemplate && pageContent) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
        <nav aria-label="Breadcrumb" className="text-sm text-content-muted">
          <ol className="flex flex-wrap items-center gap-1">
            <li>
              <Link href="/" className="hover:text-content">
                Ana Sayfa
              </Link>
            </li>
            <li aria-hidden className="text-content-muted/60">
              ›
            </li>
            <li>
              <Link href={`/yoresel-lezzetler?city=${encodeURIComponent(city)}`} className="hover:text-content">
                Yöresel Lezzetler
              </Link>
            </li>
            <li aria-hidden className="text-content-muted/60">
              ›
            </li>
            <li className="text-content">{pageContent.name}</li>
          </ol>
        </nav>

        {loading && !product ? <p className="mt-6 text-sm text-content-muted">Yükleniyor...</p> : null}
        {error ? <p className="mt-6 text-sm text-rose-400">{error}</p> : null}

        {product ? (
          <div className="mt-6 space-y-8">
            <section className="overflow-hidden rounded-2xl border border-border/70 bg-surface-card">
              <div className="flex flex-col md:flex-row">
                {product.image_url ? (
                  <div className="relative h-52 w-full shrink-0 md:h-auto md:w-80 lg:w-96">
                    <RegionalProductImage
                      src={product.image_url}
                      alt={trimImageAlt(`${product.name} — yöresel lezzet görseli`)}
                      width={384}
                      height={208}
                      className="h-full w-full object-cover"
                      sizes="(max-width: 768px) 100vw, 384px"
                    />
                    <p className="absolute bottom-0 left-0 right-0 bg-black/55 px-3 py-1 text-[10px] text-white/90">
                      Temsili GastroSkor illüstrasyonu
                    </p>
                  </div>
                ) : null}
                <div className="min-w-0 flex-1 p-5 sm:p-6">
                  <span className="inline-flex rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    Tescilli ürün
                  </span>
                  <h1 className="mt-3 text-2xl font-bold text-content sm:text-3xl">{resolveRegionalFlavorH1(pageContent)}</h1>
                  <p className="mt-2 text-sm text-content-muted">
                    {pageContent.kategori} · {pageContent.tescilYili} · {product.indication_type}
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <p className="text-sm leading-relaxed text-content-muted">{pageContent.kisaTarih}</p>
              <a
                href={product.detail_url}
                className="inline-block text-xs text-brand-gold underline"
                target="_blank"
                rel="noopener noreferrer">
                Resmi tescil kaydı (TÜRKPATENT)
              </a>
            </section>

            <section className="rounded-2xl border border-border/70 bg-surface-input/40 p-5">
              <h2 className="text-lg font-semibold text-content">{pageContent.name} — ürün bilgisi</h2>
              <p className="mt-2 text-sm leading-relaxed text-content-muted">{pageContent.urunBilgisi}</p>
            </section>

            <RegionalFlavorRestaurantSection product={product} city={city} />

            <RegionalFlavorFaq items={pageContent.faq} heading={`${pageContent.name} — sık sorulan sorular`} />
          </div>
        ) : null}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <Link
        href={`/yoresel-lezzetler?city=${encodeURIComponent(city)}`}
        className="text-sm text-content-muted hover:text-content">
        ← Yöresel lezzetler
      </Link>

      {loading ? <p className="mt-6 text-sm text-content-muted">Yükleniyor...</p> : null}
      {error ? <p className="mt-6 text-sm text-rose-400">{error}</p> : null}

      {product ? (
        <div className="mt-4 space-y-8">
          <div className="flex flex-col gap-4 overflow-hidden rounded-2xl border border-border/70 bg-surface-card sm:flex-row">
            <div className="min-w-0 flex-1 p-5 sm:p-6">
              <span className="self-start rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-gold">
                TÜRKPATENT tescilli ürün
              </span>
              <h1 className="mt-3 text-3xl font-bold text-content">{product.name}</h1>
              <p className="mt-2 text-sm text-content-muted">
                {product.region} · {product.registration_year} · {product.indication_type}
              </p>
              <a
                href={product.detail_url}
                className="mt-3 inline-block text-xs text-brand-gold underline"
                target="_blank"
                rel="noopener noreferrer">
                Resmi tescil kaydı (TÜRKPATENT)
              </a>
            </div>
            {product.image_url ? (
              <div className="relative h-48 w-full shrink-0 border-t border-border/40 sm:h-auto sm:w-56 sm:border-l sm:border-t-0 md:w-72">
                <RegionalProductImage
                  src={product.image_url}
                  alt={trimImageAlt(`${product.name} — yöresel lezzet görseli`)}
                  width={288}
                  height={192}
                  className="h-full w-full object-cover"
                  sizes="(max-width: 640px) 100vw, 288px"
                />
              </div>
            ) : null}
          </div>

          <RegionalFlavorRestaurantSection product={product} city={city} />
        </div>
      ) : null}
    </main>
  );
}
