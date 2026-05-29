'use client';

import { useEffect, useState } from 'react';

import { RestaurantCard } from '@/components/RestaurantCard';
import { listNewMemberRestaurants } from '@/lib/api';
import type { RestaurantListItem } from '@/lib/types';

export function NewMemberRestaurants() {
  const [items, setItems] = useState<RestaurantListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    listNewMemberRestaurants()
      .then((data) => {
        if (!cancelled) setItems(data.items);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div>
        <p className="text-sm font-medium uppercase tracking-wider text-accent">Yeni uyeler</p>
        <h2 className="text-xl font-semibold text-content sm:text-2xl">
          🆕 Bu Hafta GastroSkor&apos;a Katıldı
        </h2>
        <p className="mt-1 text-sm text-content-muted">Yeni üye restoranları keşfet</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3">
        {items.map((restaurant) => (
          <RestaurantCard
            key={restaurant.id}
            restaurant={restaurant}
            compact
            featuredBorder
            cornerBadge="🆕 YENİ ÜYE"
          />
        ))}
      </div>
    </section>
  );
}
