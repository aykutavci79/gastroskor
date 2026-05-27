import type { GeoIndication } from '@/lib/types';

type Props = {
  items: GeoIndication[];
  compact?: boolean;
};

export function GeoIndicationPanel({ items, compact = false }: Props) {
  if (!items.length) {
    return null;
  }

  return (
    <section
      className={
        compact
          ? 'flex flex-wrap gap-2'
          : 'rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5'
      }
    >
      {!compact ? (
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">
            Coğrafi işaretli ürünler
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Bu mekanda sunulan, tescilli veya tanınmış yöresel ürünler.
          </p>
        </div>
      ) : null}

      <ul className={compact ? 'contents' : 'space-y-3'}>
        {items.map((item) => (
          <li
            key={`${item.product}-${item.region ?? ''}`}
            className={
              compact
                ? 'inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-xs text-amber-100'
                : 'flex flex-wrap items-start justify-between gap-3 rounded-xl border border-amber-500/20 bg-slate-900/50 px-4 py-3'
            }
          >
            <div>
              <p className={compact ? 'font-medium' : 'font-semibold text-amber-50'}>
                {item.product}
              </p>
              {!compact && item.region ? (
                <p className="text-sm text-slate-400">{item.region}</p>
              ) : null}
            </div>
            <span
              className={
                compact
                  ? 'rounded bg-amber-600/80 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-950'
                  : 'shrink-0 rounded-lg bg-amber-500 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-950'
              }
            >
              Coğrafi işaret
            </span>
          </li>
        ))}
      </ul>

      {!compact ? (
        <p className="mt-4 text-xs text-slate-500">
          Kayit: Turk Patent ve Marka Kurumu cografi isaret tescilleri (ornek veri).
        </p>
      ) : null}
    </section>
  );
}
