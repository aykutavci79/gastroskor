'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

import { POST_AUTH_WELCOME_PATH } from '@/lib/post-auth-callback';

import { GastroSkorLogo } from '@/components/GastroSkorLogo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useDetectedCity } from '@/hooks/useDetectedCity';
import { cityDisplayName } from '@/lib/detect-city';

export function SiteHeader() {
  const { data: session, status } = useSession();
  const { city, status: cityStatus } = useDetectedCity();
  const isAuthenticated = status === 'authenticated';

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="group flex items-center gap-3">
          <GastroSkorLogo
            className="h-12 w-12 shrink-0 object-contain sm:h-14 sm:w-14"
            width={56}
            height={56}
            priority
          />
          <div className="leading-tight">
            <span className="block text-lg font-bold tracking-tight text-content">
              Gastro<span className="text-brand">Skor</span>
            </span>
            <span className="hidden text-[11px] font-medium text-brand sm:block">Tek Tıkla Gastro</span>
          </div>
        </Link>

        <div
          className="flex min-w-0 flex-1 items-center justify-center px-2 sm:justify-start sm:pl-2 lg:flex-none lg:pl-4"
          aria-label="GastroSkor sloganı">
          <p className="text-center text-xs font-semibold leading-snug text-content-muted sm:text-left sm:text-sm">
            <span className="text-content">Keşfet</span>
            <span aria-hidden className="mx-1 text-content-muted/45">
              ·
            </span>
            <span className="text-content">Puanla</span>
            <span aria-hidden className="mx-1 text-content-muted/45">
              ·
            </span>
            <span className="text-brand-gold">Paylaş</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          <ThemeToggle />
          <span
            className="rounded-full border border-border bg-surface-input px-3 py-1 text-xs font-medium text-content-muted"
            title={
              cityStatus === 'loading'
                ? 'Konum aliniyor'
                : cityStatus === 'denied'
                  ? 'Konum kapali — varsayilan sehir'
                  : 'Konumuna gore sehir'
            }>
            {cityStatus === 'loading' ? 'Konum…' : `📍 ${cityDisplayName(city)}`}
          </span>

          {isAuthenticated ? (
            <button type="button" onClick={() => signOut({ callbackUrl: '/' })} className="btn-secondary btn-sm">
              Çıkış
            </button>
          ) : (
            <Link href={`/auth/giris?callbackUrl=${encodeURIComponent(POST_AUTH_WELCOME_PATH)}`} className="btn-primary btn-sm whitespace-nowrap">
              Kullanıcı girişi
            </Link>
          )}

          <Link href="/panel" className="btn-secondary btn-sm whitespace-nowrap">
            Restoran girişi
          </Link>
        </div>
      </div>
    </header>
  );
}
