'use client';

import { FeaturedCityTop } from '@/components/FeaturedCityTop';
import { LivePlaceSearch } from '@/components/LivePlaceSearch';
import { NewMemberRestaurants } from '@/components/NewMemberRestaurants';
import { useDetectedCity } from '@/hooks/useDetectedCity';

export function HomePageContent() {
  const { city, status, coords } = useDetectedCity();

  return (
    <div className="space-y-8">
      <section className="card rounded-3xl bg-gradient-to-r from-surface-card via-surface-input to-surface-card p-6 sm:p-8">
        <p className="mb-2 text-sm font-medium uppercase tracking-wider text-brand">GastroSkor</p>
        <p className="mb-1 text-sm font-semibold text-brand-gold">Tek Tıkla Gastro</p>
        <h1 className="mb-3 text-2xl font-bold text-content sm:text-4xl">
          Türkiye restoranlarını tek çatıda puanla
        </h1>
        <p className="max-w-2xl text-sm text-content-muted sm:text-base">
          Mekan adını yaz, keşfet, GS yorumunu bırak. Giriş için sağ üstte{' '}
          <strong className="text-content">Kullanıcı girişi</strong> — işletme paneli için{' '}
          <strong className="text-content">Restoran girişi</strong>.
        </p>
      </section>

      <LivePlaceSearch city={city} cityStatus={status} userCoords={coords} embedded />

      <NewMemberRestaurants />
      <FeaturedCityTop />
    </div>
  );
}
