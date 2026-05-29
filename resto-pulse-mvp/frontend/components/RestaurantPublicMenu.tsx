import type { RestaurantMenuItem } from '@/lib/types';

type Props = {
  items: RestaurantMenuItem[];
};

export function RestaurantPublicMenu({ items }: Props) {
  if (!items.length) return null;

  const byCategory = items.reduce<Record<string, RestaurantMenuItem[]>>((acc, item) => {
    const key = item.category?.trim() || 'Menu';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <section className="rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-500/10 to-surface-input p-6">
      <h2 className="text-lg font-semibold text-brand-gold">Menu ve fiyatlar</h2>
      <p className="mt-1 text-xs text-content-muted">Isletme tarafindan girildi · Abonelik aktifken yayinda</p>
      <div className="mt-4 space-y-5">
        {Object.entries(byCategory).map(([category, rows]) => (
          <div key={category}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-gold/90">{category}</h3>
            <ul className="mt-2 divide-y divide-border/80">
              {rows.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3 py-2.5">
                  <div>
                    <p className="font-medium text-content">{item.name}</p>
                    {item.description ? (
                      <p className="mt-0.5 text-xs text-content-muted">{item.description}</p>
                    ) : null}
                  </div>
                  <p className="shrink-0 text-sm font-bold text-brand-gold">{item.price_tl.toFixed(2)} TL</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
