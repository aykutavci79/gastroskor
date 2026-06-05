'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn, signOut, useSession } from 'next-auth/react';

import { useDetectedCity } from '@/hooks/useDetectedCity';

/** TPE yoresel lezzet katalogu acik sehirler (genisletilecek). */
const REGIONAL_FLAVOR_CITIES = [{ value: 'Bursa', href: '/yoresel-lezzetler' }] as const;

export function SiteHeader() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { city, status: cityStatus } = useDetectedCity();
  const isAuthenticated = status === 'authenticated';

  function openRegionalFlavors(cityValue: string) {
    const entry = REGIONAL_FLAVOR_CITIES.find((item) => item.value === cityValue);
    if (!entry) return;
    router.push(`${entry.href}?city=${encodeURIComponent(entry.value)}`);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="group flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="GastroSkor"
            width={56}
            height={56}
            className="h-12 w-12 shrink-0 object-contain sm:h-14 sm:w-14"
            priority
          />
          <div className="leading-tight">
            <span className="block text-lg font-bold tracking-tight text-content">
              Gastro<span className="text-brand">Skor</span>
            </span>
            <span className="hidden text-[11px] font-medium text-brand sm:block">Tek Tıkla Gastro</span>
          </div>
        </Link>

        <nav
          className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-2 sm:justify-start sm:pl-2 lg:flex-none lg:pl-4"
          aria-label="Yöresel lezzetler">
          <Link
            href="/yoresel-lezzetler?city=Bursa"
            className="whitespace-nowrap text-sm font-semibold text-content hover:text-brand-gold">
            Yöresel lezzetler
          </Link>
          <label className="sr-only" htmlFor="regional-flavor-city">
            Şehir seçin
          </label>
          <select
            id="regional-flavor-city"
            defaultValue=""
            onChange={(event) => {
              const value = event.target.value;
              if (value) openRegionalFlavors(value);
              event.target.value = '';
            }}
            className="max-w-[9rem] rounded-lg border border-amber-500/35 bg-amber-500/10 px-2.5 py-1.5 text-xs font-semibold text-brand-gold outline-none focus:border-amber-500/60">
            <option value="" disabled>
              Şehir
            </option>
            {REGIONAL_FLAVOR_CITIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.value}
              </option>
            ))}
          </select>
        </nav>

        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          <span
            className="rounded-full border border-border bg-surface-input px-3 py-1 text-xs font-medium text-content-muted"
            title={
              cityStatus === 'loading'
                ? 'Konum aliniyor'
                : cityStatus === 'denied'
                  ? 'Konum kapali — varsayilan sehir'
                  : 'Konumuna gore sehir'
            }>
            {cityStatus === 'loading' ? 'Konum…' : `📍 ${city}`}
          </span>

          {isAuthenticated ? (
            <button type="button" onClick={() => signOut({ callbackUrl: '/' })} className="btn-secondary btn-sm">
              Çıkış
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void signIn('google', { callbackUrl: '/' })}
              className="btn-primary btn-sm whitespace-nowrap">
              Kullanıcı girişi
            </button>
          )}

          <Link href="/panel" className="btn-secondary btn-sm whitespace-nowrap">
            Restoran girişi
          </Link>
        </div>
      </div>
    </header>
  );
}
