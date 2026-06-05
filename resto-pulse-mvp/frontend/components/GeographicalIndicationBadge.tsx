import type { GeoIndication } from '@/lib/types';

type Props = {
  hasGeographicalIndication: boolean;
  giProductName: string | null;
  geoIndications?: GeoIndication[];
  compact?: boolean;
};

function productLabels({
  hasGeographicalIndication,
  giProductName,
  geoIndications = [],
}: Pick<Props, 'hasGeographicalIndication' | 'giProductName' | 'geoIndications'>): string[] {
  const fromJson = geoIndications.map((item) => item.product).filter(Boolean);
  if (fromJson.length > 0) {
    return fromJson;
  }
  if (hasGeographicalIndication && giProductName) {
    return [giProductName];
  }
  return [];
}

export function GeographicalIndicationBadge({
  hasGeographicalIndication,
  giProductName,
  geoIndications = [],
  compact = false,
}: Props) {
  const products = productLabels({ hasGeographicalIndication, giProductName, geoIndications });
  if (!hasGeographicalIndication && products.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {products.map((product) => (
          <span
            key={product}
            className="inline-flex max-w-full flex-col gap-0.5 rounded-full border border-amber-500/50 bg-amber-500/15 px-2.5 py-1 text-xs text-brand-gold"
            title={product}>
            <span className="text-[10px] font-bold uppercase tracking-wide text-brand-gold">
              Mahreç
            </span>
            <span className="truncate font-medium">{product}</span>
          </span>
        ))}
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-brand-gold">
        Mahreç — yöresel lezzet
      </p>
      <ul className="mt-3 space-y-2">
        {products.map((product) => (
          <li
            key={product}
            className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/25 bg-surface-card px-4 py-3">
            <p className="font-semibold text-amber-50">{product}</p>
            <span className="shrink-0 rounded-lg bg-amber-500 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-surface">
              Tescilli
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-content-muted">
        Kayıt:{' '}
        <a
          href="https://ci.turkpatent.gov.tr/"
          className="text-brand-gold underline"
          target="_blank"
          rel="noopener noreferrer">
          TÜRKPATENT Coğrafi İşaretler Portalı
        </a>
        . Rozet, mekânın menüsünde sunulan tescilli yöresel lezzeti gösterir.
      </p>
    </section>
  );
}
