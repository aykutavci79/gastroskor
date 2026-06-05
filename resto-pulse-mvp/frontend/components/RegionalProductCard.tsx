import Link from 'next/link';

import type { RegionalProductItem } from '@/lib/types';

type Props = {
  item: RegionalProductItem;
  href: string;
};

export function RegionalProductCard({ item, href }: Props) {
  return (
    <Link
      href={href}
      className="group flex overflow-hidden rounded-2xl border border-border/70 bg-surface-card transition hover:border-amber-500/40">
      <div className="flex min-w-0 flex-1 flex-col p-5">
        <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-gold self-start">
          Mahreç
        </span>
        <h2 className="mt-2 text-xl font-semibold text-content group-hover:text-brand-gold">{item.name}</h2>
        <p className="mt-1 text-xs text-content-muted">
          {item.region} · {item.registration_year} · {item.indication_type}
        </p>
        <p className="mt-3 line-clamp-3 text-sm text-content-muted">{item.summary}</p>
        <p className="mt-4 text-sm font-medium text-brand-gold">
          {item.restaurant_count > 0
            ? `${item.restaurant_count} restoran listeleniyor`
            : 'Restoran önerileri için tıklayın'}
        </p>
      </div>
      {item.image_url ? (
        <div className="relative hidden w-28 shrink-0 border-l border-border/40 bg-surface-input sm:block md:w-36 lg:w-40">
          {/* TÜRKPATENT resmi — resmi portal kaynagi */}
          <img
            src={item.image_url}
            alt={item.name}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="h-full min-h-[9rem] w-full object-cover"
          />
        </div>
      ) : null}
    </Link>
  );
}
