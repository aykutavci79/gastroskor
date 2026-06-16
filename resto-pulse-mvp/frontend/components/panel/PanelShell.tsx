'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signIn, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';

const AUTH_ERROR_TR: Record<string, string> = {
  AccessDenied:
    'Google bu hesaba izin vermedi. OAuth consent ekraninda Testing modundaysan giris yaptigin Gmail Test users listesinde olmali.',
  Configuration:
    'Sunucu ayari eksik: frontend/.env.local icinde GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET ve NEXTAUTH_SECRET dolu olmali. npm run dev yeniden baslat.',
  OAuthCallback:
    'Google donus hatasi: Client secret yanlis/eski olabilir (Cloud Console -> Web client -> yeni secret kopyala). Veya localhost callback URI eksik.',
  OAuthSignin: 'Google giris baslatilamadi. Tarayicida http://localhost:3000 kullan (127.0.0.1 degil).',
  Callback: 'Oturum olusturulamadi. Once /api/auth/force-signout ac, tekrar dene.',
  Default: 'Giris basarisiz. Adres cubugundaki ?error= degerini kontrol et.',
};

function authErrorMessage(code: string | null): string | null {
  if (!code) return null;
  return AUTH_ERROR_TR[code] ?? AUTH_ERROR_TR.Default;
}

import { KvkkConsentCheckbox } from '@/components/KvkkConsentCheckbox';
import { PanelContractBanner } from '@/components/panel/PanelContractBanner';
import { PanelNotificationCenter } from '@/components/panel/PanelNotificationCenter';
import { PanelProvider, usePanel } from '@/components/panel/PanelContext';
import { setKvkkConsentCookie } from '@/lib/kvkk-consent';

function PanelShellInner({ children }: { children: React.ReactNode }) {
  const { access, loading, error, userEmail } = usePanel();
  const pathname = usePathname();
  const router = useRouter();
  const [authError, setAuthError] = useState<string | null>(null);
  const [kvkkAccepted, setKvkkAccepted] = useState(false);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('error');
    setAuthError(authErrorMessage(code));
  }, []);
  const onClaimPage = pathname.startsWith('/panel/claim');
  const onAdminPage = pathname.startsWith('/panel/admin');
  const [isPanelAdmin, setIsPanelAdmin] = useState(false);

  useEffect(() => {
    if (!userEmail) {
      setIsPanelAdmin(false);
      return;
    }
    fetch('/api/panel/admin/status')
      .then((r) => r.json())
      .then((data: { is_panel_admin?: boolean }) => setIsPanelAdmin(Boolean(data.is_panel_admin)))
      .catch(() => setIsPanelAdmin(false));
  }, [userEmail]);

  useEffect(() => {
    if (loading || !userEmail) return;
    if (onAdminPage) return;
    if (!access?.has_ownership && !onClaimPage) {
      router.replace('/panel/claim');
      return;
    }
    if (access?.has_ownership && !access.can_access_panel && !onClaimPage) {
      router.replace('/panel/claim');
    }
  }, [access, loading, onAdminPage, onClaimPage, router, userEmail]);

  const contractBlocked = Boolean(access?.contract_blocked);

  if (!userEmail) {
    return (
      <div className="rounded-2xl border border-border/70 bg-surface-input p-8 text-center">
        <h1 className="text-xl font-semibold text-content">Restoran Paneli</h1>
        <p className="mt-2 text-sm text-content-muted">Devam etmek icin Google ile giris yapin.</p>
        {authError ? (
          <p className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-left text-sm text-rose-100">
            {authError}
          </p>
        ) : null}
        <div className="mt-4 text-left">
          <KvkkConsentCheckbox checked={kvkkAccepted} onChange={setKvkkAccepted} id="kvkk-panel" />
        </div>
        <button
          type="button"
          disabled={!kvkkAccepted}
          onClick={() => {
            setKvkkConsentCookie();
            signIn('google', { callbackUrl: '/panel' });
          }}
          className="mt-4 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-surface disabled:cursor-not-allowed disabled:opacity-45">
          Google ile Giris
        </button>
      </div>
    );
  }

  if (loading) {
    return <p className="text-sm text-content-muted">Panel yukleniyor...</p>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border/70 bg-surface-input p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-success">Restoran Paneli</p>
            <h1 className="text-2xl font-semibold text-content">
              {access?.restaurant_name ?? 'GastroSkor Isletme'}
            </h1>
            {access?.trial_days_left != null ? (
              <p className="mt-1 text-sm text-content-muted">
                Deneme: {access.trial_days_left} gun kaldi
                {access.pricing_next ? ` · Sonra ${access.pricing_next} TL/ay` : ''}
              </p>
            ) : null}
            {access?.panel_tier === 'limited' ? (
              <p className="mt-2 text-sm text-brand-gold">
                Kisitli panel: sikayetleri okuyabilirsiniz; mesaj ve kupon icin ziyaret dogrulamasi
                bekleniyor.
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {access?.can_access_panel && userEmail ? (
              <PanelNotificationCenter userEmail={userEmail} />
            ) : null}
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/panel' })}
              className="rounded-lg border border-border px-3 py-1.5 text-xs text-content-muted hover:bg-surface-input">
              Cikis
            </button>
            {isPanelAdmin ? (
              <>
                <Link
                  href="/panel/admin/kpi"
                  className={`rounded-lg px-3 py-1.5 text-xs ${pathname.startsWith('/panel/admin/kpi') ? 'bg-emerald-500/20 text-success' : 'border border-emerald-500/40 text-success hover:bg-emerald-500/10'}`}>
                  KPI
                </Link>
                <Link
                  href="/panel/admin"
                  className={`rounded-lg px-3 py-1.5 text-xs ${onAdminPage && !pathname.startsWith('/panel/admin/kpi') ? 'bg-amber-500/20 text-brand-gold' : 'border border-amber-500/40 text-brand-gold hover:bg-amber-500/10'}`}>
                  Admin
                </Link>
              </>
            ) : null}
          {access?.can_access_panel ? (
            <nav className="flex flex-wrap gap-2 text-sm">
              <Link
                href="/panel"
                className={`rounded-lg px-3 py-1.5 ${pathname === '/panel' ? 'bg-emerald-500/20 text-success' : 'text-content-muted hover:bg-surface-input'}`}>
                Dashboard
              </Link>
              <Link
                href={`/panel/feedback?restaurant_id=${access.restaurant_id ?? ''}`}
                className={`rounded-lg px-3 py-1.5 ${pathname.startsWith('/panel/feedback') ? 'bg-emerald-500/20 text-success' : 'text-content-muted hover:bg-surface-input'}`}>
                Sikayetler
              </Link>
              <Link
                href="/panel/followers"
                className={`rounded-lg px-3 py-1.5 ${pathname.startsWith('/panel/followers') ? 'bg-emerald-500/20 text-success' : 'text-content-muted hover:bg-surface-input'}`}>
                Takipçiler
              </Link>
            </nav>
          ) : null}
          </div>
        </div>
        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
      </section>
      {contractBlocked ? (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6 text-sm text-rose-100">
          <p className="font-semibold text-rose-50">Panel erişimi kapatıldı</p>
          <p className="mt-2">
            {access?.panel_block_reason ??
              'Deneme süresi sona erdi ve imzalı sözleşme ulaşmadı.'}
          </p>
          <p className="mt-2">
            Sözleşmeyi ilettikten sonra{' '}
            <a href="mailto:destek@gastroskor.com.tr" className="underline">
              destek@gastroskor.com.tr
            </a>{' '}
            ile iletişime geçin.
          </p>
        </div>
      ) : (
        <>
          <PanelContractBanner />
          {children}
        </>
      )}
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
