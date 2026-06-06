'use client';

import { useEffect, useState } from 'react';

import { listRestaurants } from '@/lib/api';
import { RestaurantCard } from '@/components/RestaurantCard';
import type { RestaurantListItem } from '@/lib/types';

export function HomeDbRestaurants() {
  const [items, setItems] = useState<RestaurantListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    listRestaurants({ city: 'Bursa' })
      .then((rows) => {
        if (!cancelled) setItems(rows);
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

  if (loading) {
    return (
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-content">Kayıtlı restoranlar</h2>
        <div className="h-32 animate-pulse rounded-2xl bg-surface-input" />
      </section>
    );
  }

  if (items.length === 0) return null;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold text-content">Kayıtlı restoranlar</h2>
        <p className="text-sm text-content-muted">GastroSkor veritabanındaki üye ve yorumlu mekanlar</p>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
        {items.slice(0, 12).map((restaurant) => (
          <RestaurantCard key={restaurant.id} restaurant={restaurant} compact />
        ))}
      </div>
    </section>
  );
}
