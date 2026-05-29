'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signIn, signOut } from 'next-auth/react';
import { useEffect } from 'react';

import { PanelProvider, usePanel } from '@/components/panel/PanelContext';

function PanelShellInner({ children }: { children: React.ReactNode }) {
  const { access, loading, error, userEmail } = usePanel();
  const pathname = usePathname();
  const router = useRouter();
  const onClaimPage = pathname.startsWith('/panel/claim');

  useEffect(() => {
    if (loading || !userEmail) return;
    if (!access?.has_ownership && !onClaimPage) {
      router.replace('/panel/claim');
      return;
    }
    if (access?.has_ownership && !access.can_access_panel && !onClaimPage) {
      router.replace('/panel/claim');
    }
  }, [access, loading, onClaimPage, router, userEmail]);

  if (!userEmail) {
    return (
      <div className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-8 text-center">
        <h1 className="text-xl font-semibold text-white">Restoran Paneli</h1>
        <p className="mt-2 text-sm text-slate-400">Devam etmek icin Google ile giris yapin.</p>
        <button
          type="button"
          onClick={() => signIn('google', { callbackUrl: '/panel' })}
          className="mt-4 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-slate-950">
          Google ile Giris
        </button>
      </div>
    );
  }

  if (loading) {
    return <p className="text-sm text-slate-400">Panel yukleniyor...</p>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-emerald-300">Restoran Paneli</p>
            <h1 className="text-2xl font-semibold text-white">
              {access?.restaurant_name ?? 'GastroSkor Isletme'}
            </h1>
            {access?.trial_days_left != null ? (
              <p className="mt-1 text-sm text-slate-400">
                Deneme: {access.trial_days_left} gun kaldi
                {access.pricing_next ? ` · Sonra ${access.pricing_next} TL/ay` : ''}
              </p>
            ) : null}
            {access?.panel_tier === 'limited' ? (
              <p className="mt-2 text-sm text-amber-200">
                Kisitli panel: sikayetleri okuyabilirsiniz; mesaj ve kupon icin ziyaret dogrulamasi
                bekleniyor.
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/panel' })}
              className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800">
              Cikis
            </button>
          {access?.can_access_panel ? (
            <nav className="flex flex-wrap gap-2 text-sm">
              <Link
                href="/panel"
                className={`rounded-lg px-3 py-1.5 ${pathname === '/panel' ? 'bg-emerald-500/20 text-emerald-200' : 'text-slate-300 hover:bg-slate-800'}`}>
                Dashboard
              </Link>
              <Link
                href={`/panel/feedback?restaurant_id=${access.restaurant_id ?? ''}`}
                className={`rounded-lg px-3 py-1.5 ${pathname.startsWith('/panel/feedback') ? 'bg-emerald-500/20 text-emerald-200' : 'text-slate-300 hover:bg-slate-800'}`}>
                Sikayetler
              </Link>
            </nav>
          ) : null}
          </div>
        </div>
        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
      </section>
      {children}
    </div>
  );
}

export function PanelShell({ children }: { children: React.ReactNode }) {
  return (
    <PanelProvider>
      <PanelShellInner>{children}</PanelShellInner>
    </PanelProvider>
  );
}
