'use client';

import Image from 'next/image';
import Link from 'next/link';
import { signIn, signOut, useSession } from 'next-auth/react';

import { useDetectedCity } from '@/hooks/useDetectedCity';

export function SiteHeader() {
  const { data: session, status } = useSession();
  const { city, status: cityStatus } = useDetectedCity();
  const isAuthenticated = status === 'authenticated';

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="group flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="GastroSkor"
            width={40}
            height={40}
            className="h-10 w-10 rounded-xl object-contain"
            priority
          />
          <div className="leading-tight">
            <span className="block text-lg font-bold tracking-tight text-content">
              Gastro<span className="text-brand">Skor</span>
            </span>
            <span className="hidden text-[11px] font-medium text-brand sm:block">Tek Tıkla Gastro</span>
          </div>
        </Link>

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
